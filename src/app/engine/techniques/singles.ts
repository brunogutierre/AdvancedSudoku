import { ALL_CANDIDATES, digitBit, lowestDigit, popcount } from '../bits';
import { BOXES, cellName, COLS, ROWS, UNITS, unitRef } from '../peers';
import type { CellIndex, UnitType } from '../types';
import type { CandidateState, Step } from './step';
import { explainKey, unitParams } from './step';

/** The last empty cell of a row, column or box takes the only missing digit. */
export function fullHouse(state: CandidateState): Step | null {
  const { grid, candidates } = state;
  for (let u = 0; u < UNITS.length; u++) {
    let emptyCell = -1;
    let emptyCount = 0;
    let used = 0;
    for (const cell of UNITS[u]) {
      const v = grid[cell];
      if (v === 0) {
        emptyCount++;
        emptyCell = cell;
      } else {
        used |= 1 << (v - 1);
      }
    }
    const missing = ALL_CANDIDATES & ~used;
    if (emptyCount !== 1 || popcount(missing) !== 1 || (candidates[emptyCell] & missing) === 0)
      continue;
    const digit = lowestDigit(missing);
    const unit = unitRef(u);
    return {
      technique: 'fullHouse',
      placements: [{ cell: emptyCell, digit }],
      eliminations: [],
      highlights: { cells: [emptyCell], units: [unit], digits: [digit] },
      explainKey: explainKey('fullHouse'),
      params: { cell: cellName(emptyCell), digit, ...unitParams(unit.type, unit.index) },
    };
  }
  return null;
}

/** A cell with a single candidate left must hold it. */
export function nakedSingle(state: CandidateState): Step | null {
  const { grid, candidates } = state;
  for (let cell = 0; cell < 81; cell++) {
    if (grid[cell] !== 0 || popcount(candidates[cell]) !== 1) continue;
    const digit = lowestDigit(candidates[cell]);
    return {
      technique: 'nakedSingle',
      placements: [{ cell, digit }],
      eliminations: [],
      highlights: { cells: [cell], units: [], digits: [digit] },
      explainKey: explainKey('nakedSingle'),
      params: { cell: cellName(cell), digit },
    };
  }
  return null;
}

/** Boxes first: humans scan boxes for hidden singles before lines. */
const HIDDEN_SINGLE_UNITS: readonly (readonly [UnitType, readonly (readonly CellIndex[])[]])[] = [
  ['box', BOXES],
  ['row', ROWS],
  ['col', COLS],
];

/** A digit that fits in only one cell of a unit must go there. */
export function hiddenSingle(state: CandidateState): Step | null {
  const { grid, candidates } = state;
  for (const [type, units] of HIDDEN_SINGLE_UNITS) {
    for (let index = 0; index < 9; index++) {
      const cells = units[index];
      // Bitwise counting: `once` = digits seen at least once, `twice` = seen at least twice.
      let once = 0;
      let twice = 0;
      let placed = 0;
      for (const cell of cells) {
        if (grid[cell] !== 0) {
          placed |= 1 << (grid[cell] - 1);
          continue;
        }
        twice |= once & candidates[cell];
        once |= candidates[cell];
      }
      const singles = once & ~twice & ~placed;
      if (singles === 0) continue;
      const digit = lowestDigit(singles);
      const cell = cells.find((c) => grid[c] === 0 && (candidates[c] & digitBit(digit)) !== 0)!;
      return {
        technique: 'hiddenSingle',
        placements: [{ cell, digit }],
        eliminations: [],
        highlights: { cells: [cell], units: [{ type, index }], digits: [digit] },
        explainKey: explainKey('hiddenSingle'),
        params: { cell: cellName(cell), digit, ...unitParams(type, index) },
      };
    }
  }
  return null;
}
