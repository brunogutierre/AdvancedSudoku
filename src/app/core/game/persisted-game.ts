import { parseGrid, serializeGrid } from '../../engine';
import type { GameState } from './game.model';

/** JSON-friendly snapshot of a game (typed arrays become strings / number arrays). */
export interface PersistedGame {
  readonly puzzle: string;
  readonly solution: string;
  readonly values: string;
  readonly notes: number[];
  readonly selected: number | null;
  readonly notesMode: boolean;
  readonly difficulty: GameState['difficulty'];
  readonly mode: GameState['mode'];
  readonly dailyDate: string | null;
  readonly seed: string | null;
  readonly elapsedMs: number;
  readonly status: GameState['status'];
  readonly mistakes: number;
  readonly hintsUsed: number;
  readonly assisted: boolean;
}

export function toPersisted(state: GameState): PersistedGame {
  return {
    ...state,
    puzzle: serializeGrid(state.puzzle),
    solution: serializeGrid(state.solution),
    values: serializeGrid(state.values),
    notes: Array.from(state.notes),
  };
}

/** Restores a snapshot. A game that was running comes back paused. */
export function fromPersisted(saved: PersistedGame): GameState {
  return {
    ...saved,
    puzzle: parseGrid(saved.puzzle),
    solution: parseGrid(saved.solution),
    values: parseGrid(saved.values),
    notes: Uint16Array.from(saved.notes),
    status: saved.status === 'playing' ? 'paused' : saved.status,
  };
}

const GRID = /^[0-9.]{81}$/;
const SOLUTION = /^[1-9]{81}$/;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const oneOf = (v: unknown, options: readonly unknown[]) => options.includes(v);
const isNullableString = (v: unknown) => v === null || typeof v === 'string';

/** Strict structural validation of untrusted storage data. */
export function isPersistedGame(value: unknown): value is PersistedGame {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['puzzle'] === 'string' &&
    GRID.test(v['puzzle']) &&
    typeof v['solution'] === 'string' &&
    SOLUTION.test(v['solution']) &&
    typeof v['values'] === 'string' &&
    GRID.test(v['values']) &&
    Array.isArray(v['notes']) &&
    v['notes'].length === 81 &&
    v['notes'].every((n) => isCount(n) && n <= 0x1ff) &&
    (v['selected'] === null || (isCount(v['selected']) && v['selected'] < 81)) &&
    typeof v['notesMode'] === 'boolean' &&
    oneOf(v['difficulty'], ['easy', 'medium', 'hard', 'insane']) &&
    oneOf(v['mode'], ['classic', 'daily']) &&
    isNullableString(v['dailyDate']) &&
    isNullableString(v['seed']) &&
    isCount(v['elapsedMs']) &&
    oneOf(v['status'], ['playing', 'paused', 'won']) &&
    isCount(v['mistakes']) &&
    isCount(v['hintsUsed']) &&
    typeof v['assisted'] === 'boolean'
  );
}
