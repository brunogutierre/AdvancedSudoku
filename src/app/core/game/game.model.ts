import type { CandidateGrid, CandidateMask, CellIndex, Grid, Tier } from '../../engine';

export type GameMode = 'classic' | 'daily';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'won';
export type Difficulty = Tier;
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameState {
  /** Givens (0 = empty). */
  readonly puzzle: Grid;
  readonly solution: Grid;
  /** Current board, givens included. */
  readonly values: Grid;
  /** Pencil marks per cell as 9-bit masks. */
  readonly notes: CandidateGrid;
  readonly selected: CellIndex | null;
  readonly notesMode: boolean;
  readonly difficulty: Difficulty;
  readonly mode: GameMode;
  readonly dailyDate: string | null;
  readonly seed: string | null;
  readonly elapsedMs: number;
  readonly status: GameStatus;
  /** Wrong digits placed (counted only in the 'solution' mistake mode). */
  readonly mistakes: number;
  readonly hintsUsed: number;
  /** True once hints or auto-candidates were used. */
  readonly assisted: boolean;
}

/** What the board needs to render one cell. */
export interface CellView {
  readonly index: CellIndex;
  readonly row: number;
  readonly col: number;
  readonly box: number;
  /** 0 when empty. */
  readonly value: number;
  readonly given: boolean;
  /** Pencil marks as a 9-bit mask (bit d-1 = digit d); use `hasDigit` / `digitsOf` from the engine. */
  readonly notes: CandidateMask;
  /** Flagged according to the mistake mode (rule conflict or wrong digit). */
  readonly conflict: boolean;
  /** Shares a row, column or box with the selected cell (when the setting is on). */
  readonly isPeer: boolean;
  /** Holds the same digit as the selected cell (when the setting is on). */
  readonly sameDigit: boolean;
  readonly selected: boolean;
}

/** Value and notes of one cell before and after a command. */
export interface CellChange {
  readonly cell: CellIndex;
  readonly before: { readonly value: number; readonly notes: number };
  readonly after: { readonly value: number; readonly notes: number };
}

export type CommandKind = 'place' | 'note' | 'erase' | 'autoCandidates' | 'hint';

/** One undoable user action: every cell it touched, as before/after diffs. */
export interface Command {
  readonly kind: CommandKind;
  readonly changes: readonly CellChange[];
}

export interface NewGameInput {
  /** 81 chars, '.' or '0' for empty cells. */
  readonly puzzle: string;
  /** 81 digits. */
  readonly solution: string;
  readonly difficulty: Difficulty;
  readonly mode?: GameMode;
  readonly dailyDate?: string;
  readonly seed?: string;
}
