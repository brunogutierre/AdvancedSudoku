import { UNITS, UNITS_OF_CELL } from '../../../engine';
import type { CellIndex } from '../../../engine';
import type { CellView } from '../../../core';

/** Something worth a sound, a vibration or an animation, derived from two board states. */
export type BoardEvent =
  | { readonly type: 'place'; readonly cell: CellIndex; readonly digit: number }
  | { readonly type: 'erase' | 'note'; readonly cell: CellIndex }
  | { readonly type: 'conflict' | 'unit' | 'digit'; readonly cells: readonly CellIndex[] };

/**
 * Events caused by a single player move. Bulk changes (auto candidates, multi-cell undo,
 * new games) produce none: feedback is for the move the player just made.
 */
export function diffBoard(prev: readonly CellView[], next: readonly CellView[]): BoardEvent[] {
  const placed = next.filter((cell, i) => cell.value !== prev[i].value);
  if (placed.length > 1) {
    return [];
  }
  if (placed.length === 0) {
    const noted = next.filter((cell, i) => cell.notes !== prev[i].notes);
    return noted.length === 1 ? [{ type: 'note', cell: noted[0].index }] : [];
  }
  const cell = placed[0];
  if (cell.value === 0) {
    return [{ type: 'erase', cell: cell.index }];
  }
  const events: BoardEvent[] = [{ type: 'place', cell: cell.index, digit: cell.value }];
  if (cell.conflict) {
    const clashing = next
      .filter((other) => other.conflict && other.value === cell.value && other.index !== cell.index)
      .map((other) => other.index);
    return [...events, { type: 'conflict', cells: [cell.index, ...clashing] }];
  }
  for (const unit of UNITS_OF_CELL[cell.index]) {
    const cells = UNITS[unit];
    if (cells.every((i) => next[i].value !== 0 && !next[i].conflict)) {
      events.push({ type: 'unit', cells });
    }
  }
  const same = next.filter((other) => other.value === cell.value);
  if (same.length === 9 && same.every((other) => !other.conflict)) {
    events.push({ type: 'digit', cells: same.map((other) => other.index) });
  }
  return events;
}
