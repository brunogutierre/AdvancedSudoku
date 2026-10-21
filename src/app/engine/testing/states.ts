import { ALL_CANDIDATES, maskOf } from '../bits';
import type { CandidateState } from '../techniques/step';
import type { CellIndex, Digit } from '../types';

/** Mutable candidate state used to build synthetic technique vectors. */
export interface TestState extends CandidateState {
  /** Restricts a cell to the given candidates. */
  only(cell: CellIndex, digits: Digit[]): TestState;
  /** Removes a digit from the candidates of the given cells. */
  remove(digit: Digit, cells: readonly CellIndex[]): TestState;
  /** Places a digit (clears the cell's candidates). */
  place(cell: CellIndex, digit: Digit): TestState;
}

/**
 * An empty board where every cell has all nine candidates: no technique applies,
 * so each test only sees the pattern it builds on top of it.
 */
export function openState(): TestState {
  const grid = new Uint8Array(81);
  const candidates = new Uint16Array(81).fill(ALL_CANDIDATES);
  const state: TestState = {
    grid,
    candidates,
    only(cell, digits) {
      candidates[cell] = maskOf(digits);
      return state;
    },
    remove(digit, cells) {
      for (const c of cells) candidates[c] &= ~(1 << (digit - 1));
      return state;
    },
    place(cell, digit) {
      grid[cell] = digit;
      candidates[cell] = 0;
      return state;
    },
  };
  return state;
}

/** Sorted "cell:digit" strings, convenient for order-independent assertions. */
export function pairs(items: readonly { cell: CellIndex; digit: Digit }[]): string[] {
  return items.map((i) => `${i.cell}:${i.digit}`).sort();
}
