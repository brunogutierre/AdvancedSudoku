import { digitsOf, lowestDigit, popcount } from '../bits';
import { cellName, isPeer, PEERS } from '../peers';
import type { CandidateState, Elimination, TechniqueStep } from './step';
import { explainKey } from './step';

/**
 * XY-Wing: a pivot {x,y} sees two pincers {x,z} and {y,z}. Whichever value the pivot takes,
 * one pincer becomes z, so z is removed from every cell that sees both pincers.
 */
export function xyWing(state: CandidateState): TechniqueStep | null {
  const { candidates } = state;
  const isBivalue = (c: number) => popcount(candidates[c]) === 2;
  for (let pivot = 0; pivot < 81; pivot++) {
    if (!isBivalue(pivot)) continue;
    const pivotMask = candidates[pivot];
    const [x, y] = digitsOf(pivotMask);
    // Pincers share exactly one digit with the pivot.
    const pincers = PEERS[pivot].filter(
      (c) => isBivalue(c) && popcount(candidates[c] & pivotMask) === 1,
    );
    for (const a of pincers) {
      if (!(candidates[a] & (1 << (x - 1)))) continue; // a = {x, z}
      const zMask = candidates[a] & ~pivotMask;
      for (const b of pincers) {
        if (candidates[b] !== ((1 << (y - 1)) | zMask)) continue; // b = {y, z}
        const z = lowestDigit(zMask);
        const eliminations: Elimination[] = [];
        for (const c of PEERS[a]) {
          if (c !== b && c !== pivot && isPeer(c, b) && candidates[c] & zMask)
            eliminations.push({ cell: c, digit: z });
        }
        if (eliminations.length === 0) continue;
        return {
          technique: 'xyWing',
          placements: [],
          eliminations,
          highlights: { cells: [pivot, a, b], units: [], digits: [x, y, z] },
          explainKey: explainKey('xyWing'),
          params: { pivot: cellName(pivot), pincer1: cellName(a), pincer2: cellName(b), x, y, z },
        };
      }
    }
  }
  return null;
}
