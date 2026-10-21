import { BOX_OF, COL_OF, conflicts, isPeer, ROW_OF } from '../../engine';
import type { CellIndex, Grid } from '../../engine';
import type { MistakeMode, Settings } from '../settings/settings.model';
import type { CellView, GameState } from './game.model';

/** The part of the game state the board view depends on. */
export type BoardSnapshot = Pick<
  GameState,
  'puzzle' | 'solution' | 'values' | 'notes' | 'selected'
>;

export type CellViewOptions = Pick<
  Settings,
  'mistakeMode' | 'highlightPeers' | 'highlightSameDigit'
>;

/**
 * Cells to flag: rule conflicts ('conflicts', givens included), digits that differ from
 * the solution ('solution', player digits only) or none ('off').
 */
export function flaggedCells(board: BoardSnapshot, mode: MistakeMode): ReadonlySet<CellIndex> {
  if (mode === 'conflicts') return conflicts(board.values);
  const wrong = new Set<CellIndex>();
  if (mode === 'off') return wrong;
  board.values.forEach((v, i) => {
    if (v !== 0 && board.puzzle[i] === 0 && v !== board.solution[i]) wrong.add(i);
  });
  return wrong;
}

export function cellViews(board: BoardSnapshot, options: CellViewOptions): CellView[] {
  const { values, notes, puzzle, selected } = board;
  const flagged = flaggedCells(board, options.mistakeMode);
  const selectedValue = selected === null ? 0 : values[selected];
  return Array.from({ length: 81 }, (_, i) => ({
    index: i,
    row: ROW_OF[i],
    col: COL_OF[i],
    box: BOX_OF[i],
    value: values[i],
    given: puzzle[i] !== 0,
    notes: values[i] === 0 ? notes[i] : 0,
    conflict: flagged.has(i),
    isPeer: options.highlightPeers && selected !== null && isPeer(selected, i),
    sameDigit:
      options.highlightSameDigit &&
      selectedValue !== 0 &&
      i !== selected &&
      values[i] === selectedValue,
    selected: i === selected,
  }));
}

/** Occurrences of each digit; index 0 is always 0. */
export function digitCounts(values: Grid): number[] {
  const counts = new Array<number>(10).fill(0);
  for (const v of values) if (v !== 0) counts[v]++;
  return counts;
}

/** Fraction (0..1) of the puzzle's empty cells that are filled; 0 for an empty puzzle. */
export function progress(puzzle: Grid, values: Grid): number {
  let empty = 0;
  let filled = 0;
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] !== 0) continue;
    empty++;
    if (values[i] !== 0) filled++;
  }
  return empty === 0 ? 0 : filled / empty;
}
