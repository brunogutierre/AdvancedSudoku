/** A Sudoku digit. `0` is never a digit: it marks an empty cell in a {@link Grid}. */
export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Index of a cell in row-major order: `row * 9 + col`, from 0 to 80. */
export type CellIndex = number;

/**
 * A 9x9 board stored as 81 bytes in row-major order.
 * `0` is an empty cell, `1..9` is a placed digit.
 */
export type Grid = Uint8Array;

/**
 * Set of digits packed into 9 bits: bit `d - 1` is set when digit `d` is a member.
 * `0` is the empty set, `0x1ff` is the full set {1..9}.
 */
export type CandidateMask = number;

/** One candidate mask per cell (0 for filled cells). */
export type CandidateGrid = Uint16Array;

export type UnitType = 'row' | 'col' | 'box';

/** A row, column or box identified by its type and its index (0..8). */
export interface UnitRef {
  readonly type: UnitType;
  readonly index: number;
}

export const GRID_SIZE = 81;
export const ALL_DIGITS: readonly Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function isDigit(value: number): value is Digit {
  return Number.isInteger(value) && value >= 1 && value <= 9;
}
