import {
  ChangeDetectionStrategy,
  Component,
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
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';
import { GameStore, SettingsStore } from '../../core';
import type { Difficulty } from '../../core';
import { EngineClient } from '../../engine-worker/engine-client';
import { formatDuration } from '../../shared/format/time';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { ActionBar, PlayAction } from './action-bar/action-bar';
import { Board } from './board/board';
import { navigate } from './board/board-nav';
import { GAME_WON_HANDLERS } from './game-events';
import { NumberPad } from './number-pad/number-pad';
import { PlayToolbar } from './play-toolbar/play-toolbar';
import { PlayCommand, resolveKey } from './play-keys';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'insane'];

function asDifficulty(value: string | undefined): Difficulty | null {
  return DIFFICULTIES.find((d) => d === value) ?? null;
}

/** Keys typed inside these keep their own meaning (header menus, form fields, dialogs). */
const OWN_KEYS = '[role="menu"], input, textarea, select, dialog';

/**
 * Play screen. `/play?difficulty=hard` starts a new game (the query param is then dropped so a
 * reload resumes instead of regenerating); `/play` resumes the saved game or starts one.
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
  ],
  providers: [provideTranslocoScope('play')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './play.html',
  styleUrl: './play.scss',
})
export class Play implements OnInit {
  /** Bound from the `difficulty` query param. */
  readonly difficulty = input<string>();

  protected readonly store = inject(GameStore);
  protected readonly settings = inject(SettingsStore);
  private readonly engine = inject(EngineClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly wonHandlers = inject(GAME_WON_HANDLERS, { optional: true }) ?? [];
  private readonly board = viewChild(Board);

  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly paused = computed(() => this.store.status() === 'paused');
  protected readonly playing = computed(() => this.store.status() === 'playing');
  protected readonly finalTime = computed(() => formatDuration(this.store.elapsedMs()));
  protected readonly boxes = Array.from({ length: 9 }, (_, i) => i);
  private request = 0;

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
    // Leaving the screen stops the clock; coming back resumes.
    inject(DestroyRef).onDestroy(() => this.store.pause());
  }

  ngOnInit(): void {
    const requested = asDifficulty(this.difficulty());
    const status = this.store.status();
    if (requested) {
      void this.start(requested);
    } else if (status === 'playing' || status === 'paused') {
      this.store.resume();
    } else {
      void this.start(status === 'won' ? this.store.difficulty() : 'easy');
    }
  }

  protected newGame(): void {
    void this.start(this.store.difficulty());
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
      // 'hint' is handled once the hints PR enables the button.
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
      if (command.toggle || this.playing()) {
        event.preventDefault();
        this.togglePause();
      }
      return;
    }
    if (!this.playing()) {
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
      default:
        return this.onAction(command.type);
    }
  }

  private async start(tier: Difficulty): Promise<void> {
    const id = ++this.request;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const puzzle = await this.engine.generate(tier);
      if (id !== this.request) {
        return;
      }
      this.store.newGame({
        puzzle: puzzle.puzzle,
        solution: puzzle.solution,
        difficulty: puzzle.tier,
        seed: puzzle.seed,
      });
      if (this.difficulty()) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true,
        });
      }
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
}
