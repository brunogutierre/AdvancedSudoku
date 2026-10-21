import { BOX_OF, BOXES, COL_OF, COLS, ROW_OF, ROWS } from '../peers';
import type { CellIndex, Digit, UnitType } from '../types';
import { ALL_DIGITS } from '../types';
import type { CandidateState, Elimination, TechniqueStep } from './step';
import { explainKey, unitParams } from './step';

/** Rows and columns with their cell lists and the cell-to-line lookup. */
const LINES: readonly (readonly [
  UnitType,
  readonly (readonly CellIndex[])[],
  readonly number[],
])[] = [
  ['row', ROWS, ROW_OF],
  ['col', COLS, COL_OF],
];

export function cellsWithDigit(
  state: CandidateState,
  cells: readonly CellIndex[],
  digit: Digit,
): CellIndex[] {
  const bit = 1 << (digit - 1);
  return cells.filter((c) => state.grid[c] === 0 && (state.candidates[c] & bit) !== 0);
}

function eliminationsOutside(
  state: CandidateState,
  cells: readonly CellIndex[],
  keep: (cell: CellIndex) => boolean,
  digit: Digit,
): Elimination[] {
  return cellsWithDigit(state, cells, digit)
    .filter((c) => !keep(c))
    .map((cell) => ({ cell, digit }));
}

/**
 * Pointing (locked candidates type 1): when a digit's candidates inside a box all lie on
 * one row (or column), the digit can be removed from that line outside the box.
 */
export function pointing(state: CandidateState): TechniqueStep | null {
  for (let box = 0; box < 9; box++) {
    for (const digit of ALL_DIGITS) {
      const cells = cellsWithDigit(state, BOXES[box], digit);
      if (cells.length < 2) continue;
      for (const [type, units, lineOf] of LINES) {
        const line = lineOf[cells[0]];
        if (!cells.every((c) => lineOf[c] === line)) continue;
        const eliminations = eliminationsOutside(
          state,
          units[line],
          (c) => BOX_OF[c] === box,
          digit,
        );
        if (eliminations.length === 0) continue;
        return {
          technique: 'pointing',
          placements: [],
          eliminations,
          highlights: {
            cells,
            units: [
              { type: 'box', index: box },
              { type, index: line },
            ],
            digits: [digit],
          },
          explainKey: explainKey('pointing'),
          params: { digit, box: box + 1, ...unitParams(type, line) },
        };
      }
    }
  }
  return null;
}

/**
 * Box/line reduction (claiming, locked candidates type 2): when a digit's candidates in a
 * row (or column) all lie in one box, the digit can be removed from the rest of that box.
 */
export function boxLineReduction(state: CandidateState): TechniqueStep | null {
  for (const [type, units, lineOf] of LINES) {
    for (let line = 0; line < 9; line++) {
      for (const digit of ALL_DIGITS) {
        const cells = cellsWithDigit(state, units[line], digit);
        if (cells.length < 2) continue;
        const box = BOX_OF[cells[0]];
        if (!cells.every((c) => BOX_OF[c] === box)) continue;
        const eliminations = eliminationsOutside(
          state,
          BOXES[box],
          (c) => lineOf[c] === line,
          digit,
        );
        if (eliminations.length === 0) continue;
        return {
          technique: 'boxLineReduction',
          placements: [],
          eliminations,
          highlights: {
            cells,
            units: [
              { type, index: line },
              { type: 'box', index: box },
            ],
            digits: [digit],
          },
          explainKey: explainKey('boxLineReduction'),
          params: { digit, box: box + 1, ...unitParams(type, line) },
        };
      }
    }
  }
  return null;
}
