import { digitsOf, maskOf, popcount } from '../bits';
import { UNITS, unitRef } from '../peers';
import type { CellIndex, Digit } from '../types';
import { ALL_DIGITS } from '../types';
import { combinations } from './combinations';
import type { CandidateState, Elimination, TechniqueStep, Technique, TechniqueId } from './step';
import { cellList, explainKey, numberList, unitParams } from './step';

function subsetStep(
  technique: TechniqueId,
  unitIndex: number,
  cells: CellIndex[],
  digits: Digit[],
  eliminations: Elimination[],
): TechniqueStep {
  const unit = unitRef(unitIndex);
  return {
    technique,
    placements: [],
    eliminations,
    highlights: { cells, units: [unit], digits },
    explainKey: explainKey(technique),
    params: {
      cells: cellList(cells),
      digits: numberList(digits),
      ...unitParams(unit.type, unit.index),
    },
  };
}

/**
 * Naked subset of size n: n cells of a unit whose candidates, together, are exactly n digits.
 * Those digits must go in those cells, so they are removed from the rest of the unit.
 */
function nakedSubset(n: number, technique: TechniqueId): Technique {
  return (state: CandidateState) => {
    const { grid, candidates } = state;
    for (let u = 0; u < UNITS.length; u++) {
      const empties = UNITS[u].filter((c) => grid[c] === 0);
      const members = empties.filter((c) => {
        const count = popcount(candidates[c]);
        return count >= 2 && count <= n;
      });
      for (const cells of combinations(members, n)) {
        let union = 0;
        for (const c of cells) union |= candidates[c];
        if (popcount(union) !== n) continue;
        const eliminations: Elimination[] = [];
        for (const c of empties) {
          if (cells.includes(c)) continue;
          for (const digit of digitsOf(candidates[c] & union))
            eliminations.push({ cell: c, digit });
        }
        if (eliminations.length > 0)
          return subsetStep(technique, u, cells, digitsOf(union), eliminations);
      }
    }
    return null;
  };
}

/**
 * Hidden subset of size n: n digits that, within a unit, only fit in the same n cells.
 * Those cells must hold those digits, so their other candidates are removed.
 */
function hiddenSubset(n: number, technique: TechniqueId): Technique {
  return (state: CandidateState) => {
    const { grid, candidates } = state;
    for (let u = 0; u < UNITS.length; u++) {
      const unitCells = UNITS[u];
      let placed = 0;
      for (const c of unitCells) if (grid[c] !== 0) placed |= 1 << (grid[c] - 1);
      // Position mask per digit: bit i set when the digit fits in unitCells[i].
      const positions = new Map<Digit, number>();
      for (const digit of ALL_DIGITS) {
        if (placed & (1 << (digit - 1))) continue;
        let mask = 0;
        unitCells.forEach((c, i) => {
          if (grid[c] === 0 && candidates[c] & (1 << (digit - 1))) mask |= 1 << i;
        });
        const count = popcount(mask);
        if (count >= 2 && count <= n) positions.set(digit, mask);
      }
      for (const digits of combinations([...positions.keys()], n)) {
        let union = 0;
        for (const d of digits) union |= positions.get(d)!;
        if (popcount(union) !== n) continue;
        const keep = maskOf(digits);
        const cells = unitCells.filter((_, i) => union & (1 << i));
        const eliminations: Elimination[] = [];
        for (const c of cells) {
          for (const digit of digitsOf(candidates[c] & ~keep))
            eliminations.push({ cell: c, digit });
        }
        if (eliminations.length > 0) return subsetStep(technique, u, cells, digits, eliminations);
      }
    }
    return null;
  };
}

export const nakedPair: Technique = nakedSubset(2, 'nakedPair');
export const nakedTriple: Technique = nakedSubset(3, 'nakedTriple');
export const hiddenPair: Technique = hiddenSubset(2, 'hiddenPair');
export const hiddenTriple: Technique = hiddenSubset(3, 'hiddenTriple');
