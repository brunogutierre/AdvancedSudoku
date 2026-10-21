import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { GameStore, SettingsStore, StatsStore } from '../../core';
import type { Difficulty } from '../../core';
import { ToastService } from '../../core/toast/toast.service';
import type { Step } from '../../engine';
import { EngineClient } from '../../engine-worker/engine-client';
import { formatDuration } from '../../shared/format/time';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { ActionBar, PlayAction } from './action-bar/action-bar';
import { Board } from './board/board';
import { navigate } from './board/board-nav';
import { GAME_WON_HANDLERS } from './game-events';
import { HintPanel } from './hints/hint-panel';
import { overlayFromStep } from './hints/hint-view';
import { NumberPad } from './number-pad/number-pad';
import { PlayToolbar } from './play-toolbar/play-toolbar';
import { RadialAnchor, RadialPicker } from './radial-picker/radial-picker';
import { PlayCommand, resolveKey } from './play-keys';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'insane'];

function asDifficulty(value: string | undefined): Difficulty | null {
  return DIFFICULTIES.find((d) => d === value) ?? null;
}

/** A new random game of a tier, or the daily puzzle of a date. */
type StartRequest = { readonly tier: Difficulty } | { readonly daily: string };

/** Keys typed inside these keep their own meaning (header menus, form fields, dialogs). */
const OWN_KEYS = '[role="menu"], input, textarea, select, dialog';

/**
 * Play screen. `/play?difficulty=hard` starts a new game and `/play?daily=2026-10-21` starts
 * (or resumes) that day's puzzle; the query param is then dropped so a reload resumes instead
 * of regenerating. `/play` resumes the saved game or starts one.
 */
@Component({
  selector: 'app-play',
  imports: [
    RouterLink,
    TranslocoPipe,
    Button,
    Icon,
    Skeleton,
    ActionBar,
    Board,
    NumberPad,
    PlayToolbar,
    RadialPicker,
    HintPanel,
  ],
  providers: [provideTranslocoScope('play', 'hints')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './play.html',
  styleUrl: './play.scss',
})
export class Play implements OnInit {
  /** Bound from the `difficulty` query param. */
  readonly difficulty = input<string>();
  /** Bound from the `daily` query param ('YYYY-MM-DD'). */
  readonly daily = input<string>();

  protected readonly store = inject(GameStore);
  protected readonly settings = inject(SettingsStore);
  private readonly stats = inject(StatsStore);
  private readonly engine = inject(EngineClient);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly wonHandlers = inject(GAME_WON_HANDLERS, { optional: true }) ?? [];
  private readonly board = viewChild(Board);

  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly paused = computed(() => this.store.status() === 'paused');
  protected readonly playing = computed(() => this.store.status() === 'playing');
  protected readonly finalTime = computed(() => formatDuration(this.store.elapsedMs()));
  protected readonly boxes = Array.from({ length: 9 }, (_, i) => i);
  protected readonly radial = signal<RadialAnchor | null>(null);
  private request = 0;
  private lastRequest: StartRequest = { tier: 'easy' };

  /** The hint panel is open; `hint` is null while the engine computes the step. */
  protected readonly hintOpen = signal(false);
  protected readonly hint = signal<Step | null>(null);
  protected readonly overlay = computed(() => {
    const step = this.hint();
    return step ? overlayFromStep(step) : null;
  });
  private hintRequest = 0;

  constructor() {
    let previous = this.store.status();
    effect(() => {
      const status = this.store.status();
      if (status === 'won' && previous === 'playing') {
        const game = untracked(this.store.state);
        this.wonHandlers.forEach((handler) => handler(game));
      }
      previous = status;
    });
    // A hint describes one position: any board change or leaving play makes it stale.
    effect(() => {
      this.store.values();
      this.store.status();
      untracked(() => this.closeHint());
    });
    // Leaving the screen stops the clock; coming back resumes.
    inject(DestroyRef).onDestroy(() => this.store.pause());
  }

  ngOnInit(): void {
    const requested = asDifficulty(this.difficulty());
    const daily = this.daily();
    const status = this.store.status();
    const unfinished = status === 'playing' || status === 'paused';
    if (daily && /^\d{4}-\d{2}-\d{2}$/.test(daily)) {
      const state = this.store.state();
      if (unfinished && state.mode === 'daily' && state.dailyDate === daily) {
        this.store.resume();
        this.dropQuery();
      } else {
        void this.start({ daily });
      }
    } else if (requested) {
      void this.start({ tier: requested });
    } else if (unfinished) {
      this.store.resume();
    } else {
      void this.start({ tier: status === 'won' ? this.store.difficulty() : 'easy' });
    }
  }

  /** Retries the request that failed (a daily stays a daily). */
  protected retry(): void {
    void this.start(this.lastRequest);
  }

  protected newGame(): void {
    void this.start({ tier: this.store.difficulty() });
  }

  protected togglePause(): void {
    if (this.paused()) {
      this.store.resume();
    } else {
      this.store.pause();
    }
  }

  protected onAction(action: PlayAction): void {
    switch (action) {
      case 'undo':
        return this.store.undo();
      case 'redo':
        return this.store.redo();
      case 'erase':
        return this.store.erase();
      case 'notes':
        return this.store.toggleNotesMode();
      case 'hint':
        return void this.requestHint();
    }
  }

  protected applyHint(step: Step): void {
    this.store.applyStep(step);
    this.closeHint();
    const selected = this.store.selected();
    if (selected !== null) {
      this.board()?.focusCell(selected);
    }
  }

  protected closeHint(): void {
    this.hintRequest++;
    this.hintOpen.set(false);
    this.hint.set(null);
  }

  /** Asks the engine for the next step on the current board, notes and solution. */
  private async requestHint(): Promise<void> {
    if (!this.playing()) {
      return;
    }
    const id = ++this.hintRequest;
    const { values, notes, solution } = this.store.state();
    this.hint.set(null);
    this.hintOpen.set(true);
    try {
      const step = await this.engine.hint(values, { notes, solution });
      if (id !== this.hintRequest) {
        return;
      }
      if (step) {
        this.hint.set(step);
      } else {
        this.closeHint();
        this.toasts.show({ message: this.transloco.translate('hints.panel.none') });
      }
    } catch {
      if (id === this.hintRequest) {
        this.closeHint();
        this.toasts.show({ message: this.transloco.translate('hints.panel.failed') });
      }
    }
  }

  protected openRadial(cell: number, armed = false): void {
    const anchor = this.playing() ? this.board()?.anchorOf(cell, armed) : null;
    if (anchor) {
      this.store.select(cell);
      this.radial.set(anchor);
    }
  }

  protected closeRadial(): void {
    const anchor = this.radial();
    this.radial.set(null);
    if (anchor) {
      this.board()?.focusCell(anchor.cell);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as Element | null;
    if (event.defaultPrevented || this.loading() || target?.closest?.(OWN_KEYS)) {
      return;
    }
    const command = resolveKey(event);
    if (!command) {
      return;
    }
    if (command.type === 'pause') {
      if (!command.toggle && this.hintOpen()) {
        event.preventDefault();
        this.closeHint();
      } else if (command.toggle || this.playing()) {
        event.preventDefault();
        this.togglePause();
      }
      return;
    }
    // Space keeps activating focused buttons; it opens the picker only from the board or page.
    const fromBoard = !target || target === this.document.body || !!target.closest?.('app-board');
    if (!this.playing() || (command.type === 'radial' && !fromBoard)) {
      return;
    }
    event.preventDefault();
    this.run(command);
  }

  private run(command: Exclude<PlayCommand, { type: 'pause' }>): void {
    switch (command.type) {
      case 'move': {
        const next = navigate(this.store.selected(), command.key, command.ctrl);
        if (next !== null) {
          this.store.select(next);
          this.board()?.focusCell(next);
        }
        return;
      }
      case 'digit':
        return this.store.input(command.digit, command.note ? { note: true } : {});
      case 'radial': {
        const selected = this.store.selected();
        return selected === null ? undefined : this.openRadial(selected);
      }
      case 'candidates':
        return this.store.autoCandidates();
      default:
        return this.onAction(command.type);
    }
  }

  private async start(request: StartRequest): Promise<void> {
    const id = ++this.request;
    this.lastRequest = request;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const puzzle =
        'daily' in request
          ? await this.engine.daily(request.daily)
          : await this.engine.generate(request.tier);
      if (id !== this.request) {
        return;
      }
      this.store.newGame({
        puzzle: puzzle.puzzle,
        solution: puzzle.solution,
        difficulty: puzzle.tier,
        seed: puzzle.seed,
        ...('daily' in request ? { mode: 'daily', dailyDate: request.daily } : {}),
      });
      this.stats.recordStart(puzzle.tier);
      this.dropQuery();
    } catch {
      if (id === this.request) {
        this.failed.set(true);
      }
    } finally {
      if (id === this.request) {
        this.loading.set(false);
      }
    }
  }

  private dropQuery(): void {
    if (this.difficulty() || this.daily()) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }
}
