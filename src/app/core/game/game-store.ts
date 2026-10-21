import { computed, DestroyRef, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { COL_OF, computeCandidates, parseGrid, ROW_OF } from '../../engine';
import type { CellIndex, Digit, Step } from '../../engine';
import { PersistenceService, STORAGE_KEYS } from '../persistence/persistence.service';
import { SettingsStore } from '../settings/settings-store';
import { applyChanges, BoardDraft } from './board-draft';
import type {
  CellView,
  Command,
  CommandKind,
  Direction,
  GameState,
  GameStatus,
  NewGameInput,
} from './game.model';
import { cellViews, digitCounts, progress } from './game-selectors';
import { fromPersisted, isPersistedGame, toPersisted } from './persisted-game';

/** Game state without the clock, which ticks every second and lives in its own signal. */
type Board = Omit<GameState, 'elapsedMs'>;

interface History {
  readonly undo: readonly Command[];
  readonly redo: readonly Command[];
}

const IDLE: Board = {
  puzzle: new Uint8Array(81),
  solution: new Uint8Array(81),
  values: new Uint8Array(81),
  notes: new Uint16Array(81),
  selected: null,
  notesMode: false,
  difficulty: 'easy',
  mode: 'classic',
  dailyDate: null,
  seed: null,
  status: 'idle',
  mistakes: 0,
  hintsUsed: 0,
  assisted: false,
};

const EMPTY_HISTORY: History = { undo: [], redo: [] };
const TICK_MS = 1000;

/**
 * Single source of truth for the game being played. State is a private signal replaced
 * immutably on every action (typed arrays are copied, 81 entries is cheap); views read
 * computed selectors. Every board action is one undoable {@link Command}.
 */
@Injectable({ providedIn: 'root' })
export class GameStore {
  private readonly settings = inject(SettingsStore);
  private readonly persistence = inject(PersistenceService);
  private readonly document = inject(DOCUMENT);

  private readonly _board = signal<Board>(IDLE);
  private readonly _elapsed = signal(0);
  private readonly _history = signal<History>(EMPTY_HISTORY);

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick = 0;
  private readonly saver = this.persistence.createSaver(STORAGE_KEYS.game, () =>
    toPersisted(this.state()),
  );

  // ---- Selectors ----

  readonly state = computed<GameState>(() => ({ ...this._board(), elapsedMs: this._elapsed() }));
  readonly status = computed(() => this._board().status);
  readonly selected = computed(() => this._board().selected);
  readonly notesMode = computed(() => this._board().notesMode);
  readonly difficulty = computed(() => this._board().difficulty);
  readonly mode = computed(() => this._board().mode);
  readonly mistakes = computed(() => this._board().mistakes);
  readonly hintsUsed = computed(() => this._board().hintsUsed);
  readonly elapsedMs = this._elapsed.asReadonly();
  readonly isWon = computed(() => this.status() === 'won');
  readonly canUndo = computed(() => this.status() === 'playing' && this._history().undo.length > 0);
  readonly canRedo = computed(() => this.status() === 'playing' && this._history().redo.length > 0);

  readonly cells = computed<CellView[]>(() =>
    cellViews(this._board(), {
      mistakeMode: this.settings.mistakeMode(),
      highlightPeers: this.settings.highlightPeers(),
      highlightSameDigit: this.settings.highlightSameDigit(),
    }),
  );

  /** How many times each digit is on the board; index 0 is unused. */
  readonly digitCounts = computed(() => digitCounts(this._board().values));

  /** Fraction (0..1) of the initially empty cells that are filled. */
  readonly progress = computed(() => progress(this._board().puzzle, this._board().values));

  constructor() {
    const saved = this.persistence.load(STORAGE_KEYS.game, isPersistedGame);
    if (saved) {
      const { elapsedMs, ...board } = fromPersisted(saved);
      this._board.set(board);
      this._elapsed.set(elapsedMs);
    }

    effect(() => {
      if (this.state().status !== 'idle') this.saver.schedule();
    });

    const onVisibility = () => {
      if (this.document.visibilityState === 'hidden') this.pause();
    };
    this.document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibility);
      this.stopTimer();
    });
  }

  // ---- Lifecycle ----

  newGame(input: NewGameInput): void {
    const puzzle = parseGrid(input.puzzle);
    const autoNotes = input.difficulty === 'easy' && this.settings.autoCandidatesEasy();
    this.stopTimer();
    this._history.set(EMPTY_HISTORY);
    this._elapsed.set(0);
    this._board.set({
      ...IDLE,
      puzzle,
      solution: parseGrid(input.solution),
      values: new Uint8Array(puzzle),
      notes: autoNotes ? computeCandidates(puzzle) : new Uint16Array(81),
      difficulty: input.difficulty,
      mode: input.mode ?? 'classic',
      dailyDate: input.dailyDate ?? null,
      seed: input.seed ?? null,
    });
    this.setStatus('playing');
  }

  pause(): void {
    if (this.status() === 'playing') this.setStatus('paused');
  }

  resume(): void {
    if (this.status() === 'paused') this.setStatus('playing');
  }

  // ---- Selection ----

  select(cell: CellIndex | null): void {
    this._board.update((b) => ({ ...b, selected: cell }));
  }

  /** Moves the selection one cell, wrapping around the edges. Selects R1C1 when nothing is selected. */
  moveSelection(direction: Direction): void {
    const current = this.selected();
    if (current === null) return this.select(0);
    const [dr, dc] = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[direction];
    const row = (ROW_OF[current] + dr + 9) % 9;
    const col = (COL_OF[current] + dc + 9) % 9;
    this.select(row * 9 + col);
  }

  // ---- Board actions (each one is a single undoable command) ----

  toggleNotesMode(): void {
    this._board.update((b) => ({ ...b, notesMode: !b.notesMode }));
  }

  /** Enters a digit in the selected cell: as a note in notes mode (or when `note` is set), otherwise as a value. */
  input(digit: Digit, options: { note?: boolean } = {}): void {
    const board = this._board();
    const cell = this.editableSelection();
    if (cell === null) return;
    const draft = new BoardDraft(board.values, board.notes);
    if (options.note ?? board.notesMode) {
      if (board.values[cell] !== 0) return;
      draft.toggleNote(cell, digit);
      this.commit('note', draft);
      return;
    }
    if (board.values[cell] === digit) return;
    draft.place(cell, digit);
    const wrong = digit !== board.solution[cell] && this.settings.mistakeMode() === 'solution';
    this.commit('place', draft, { mistakes: board.mistakes + (wrong ? 1 : 0) });
  }

  /** Clears the selected cell's value, or its notes when it has no value. */
  erase(): void {
    const cell = this.editableSelection();
    if (cell === null) return;
    const draft = this.draft();
    draft.erase(cell);
    this.commit('erase', draft);
  }

  /** Fills every empty cell's notes with its candidates. */
  autoCandidates(): void {
    if (this.status() !== 'playing') return;
    const draft = this.draft();
    draft.fillCandidates();
    this.commit('autoCandidates', draft, { assisted: true });
  }

  /**
   * Applies a hint from the engine. A `mistake` step only moves the selection to the wrong
   * cell; technique steps change the board as one command.
   */
  applyStep(step: Step): void {
    const board = this._board();
    if (board.status !== 'playing') return;
    const counters = { hintsUsed: board.hintsUsed + 1, assisted: true };
    const focus = step.placements[0]?.cell ?? step.highlights.cells[0] ?? board.selected;
    if (step.technique === 'mistake') {
      this._board.update((b) => ({ ...b, ...counters, selected: focus }));
      return;
    }
    const draft = this.draft();
    draft.applyStep(step);
    this.commit('hint', draft, { ...counters, selected: focus });
  }

  /**
   * Applies several engine steps as one undoable command and marks the game as assisted,
   * without counting hints (used by the Konami easter egg).
   */
  assist(steps: readonly Step[]): void {
    if (this.status() !== 'playing' || steps.length === 0) return;
    const draft = this.draft();
    for (const step of steps) draft.applyStep(step);
    this.commit('hint', draft, { assisted: true });
  }

  undo(): void {
    const { undo, redo } = this._history();
    const command = undo.at(-1);
    if (!command || this.status() !== 'playing') return;
    this._history.set({ undo: undo.slice(0, -1), redo: [...redo, command] });
    this.replay(command, 'before');
  }

  redo(): void {
    const { undo, redo } = this._history();
    const command = redo.at(-1);
    if (!command || this.status() !== 'playing') return;
    this._history.set({ undo: [...undo, command], redo: redo.slice(0, -1) });
    this.replay(command, 'after');
  }

  // ---- Internals ----

  private editableSelection(): CellIndex | null {
    const { status, selected, puzzle } = this._board();
    return status === 'playing' && selected !== null && puzzle[selected] === 0 ? selected : null;
  }

  private draft(): BoardDraft {
    const { values, notes } = this._board();
    return new BoardDraft(values, notes);
  }

  /** Stores the draft as a new command (clearing redo) and applies it with optional state changes. */
  private commit(kind: CommandKind, draft: BoardDraft, patch: Partial<Board> = {}): void {
    const changes = draft.changes();
    if (changes.length > 0) {
      this._history.update((h) => ({ undo: [...h.undo, { kind, changes }], redo: [] }));
    }
    this._board.update((b) => ({ ...b, ...patch, values: draft.values, notes: draft.notes }));
    this.checkWin();
  }

  private replay(command: Command, side: 'before' | 'after'): void {
    this._board.update((b) => ({
      ...b,
      ...applyChanges(b.values, b.notes, command.changes, side),
    }));
    this.checkWin();
  }

  private checkWin(): void {
    const { status, values, solution } = this._board();
    if (status === 'playing' && values.every((v, i) => v === solution[i])) this.setStatus('won');
  }

  private setStatus(status: GameStatus): void {
    this._board.update((b) => ({ ...b, status }));
    if (status === 'playing') this.startTimer();
    else this.stopTimer();
  }

  private startTimer(): void {
    if (this.timer !== null) return;
    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer === null) return;
    this.tick();
    clearInterval(this.timer);
    this.timer = null;
  }

  /** Adds the real time elapsed since the last tick (robust to throttled intervals). */
  private tick(): void {
    const now = Date.now();
    this._elapsed.update((ms) => ms + (now - this.lastTick));
    this.lastTick = now;
  }
}
