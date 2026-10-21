import { digitsOf, popcount } from '../bits';
import { cellAt } from '../peers';
import type { Digit, UnitType } from '../types';
import { ALL_DIGITS } from '../types';
import { combinations } from './combinations';
import type { CandidateState, Elimination, TechniqueStep, Technique, TechniqueId } from './step';
import { explainKey, numberList } from './step';

/**
 * Basic fish of size n (X-Wing n=2, Swordfish n=3). If, in n base lines (rows), a digit's
 * candidates all fall inside the same n cover lines (columns), the digit fills those
 * columns from the base rows only, so it is removed from the cover columns elsewhere.
 * The same holds with rows and columns swapped.
 */
function fish(n: number, technique: TechniqueId): Technique {
  return (state: CandidateState) => {
    for (const base of ['row', 'col'] as const) {
      const cover: UnitType = base === 'row' ? 'col' : 'row';
      // Map (base line, cover line) to a cell for either orientation.
      const at = (b: number, c: number) => (base === 'row' ? cellAt(b, c) : cellAt(c, b));
      for (const digit of ALL_DIGITS) {
        const step = findFish(state, n, technique, digit, base, cover, at);
        if (step) return step;
      }
    }
    return null;
  };
}

function findFish(
  state: CandidateState,
  n: number,
  technique: TechniqueId,
  digit: Digit,
  base: UnitType,
  cover: UnitType,
  at: (b: number, c: number) => number,
): TechniqueStep | null {
  const bit = 1 << (digit - 1);
  // For each base line, the cover positions where the digit is a candidate.
  const lines: { index: number; mask: number }[] = [];
  for (let b = 0; b < 9; b++) {
    let mask = 0;
    for (let c = 0; c < 9; c++) if (state.candidates[at(b, c)] & bit) mask |= 1 << c;
    const count = popcount(mask);
    if (count >= 2 && count <= n) lines.push({ index: b, mask });
  }
  for (const combo of combinations(lines, n)) {
    let union = 0;
    for (const line of combo) union |= line.mask;
    if (popcount(union) !== n) continue;
    const baseIndices = combo.map((l) => l.index);
    // digitsOf works on any 9-bit mask: here the "digits" are 1-based cover indices.
    const coverIndices = digitsOf(union).map((d) => d - 1);
    const eliminations: Elimination[] = [];
    for (const c of coverIndices) {
      for (let b = 0; b < 9; b++) {
        if (baseIndices.includes(b)) continue;
        const cell = at(b, c);
        if (state.candidates[cell] & bit) eliminations.push({ cell, digit });
      }
    }
    if (eliminations.length === 0) continue;
    const cells = baseIndices
      .flatMap((b) => coverIndices.map((c) => at(b, c)))
      .filter((cell) => state.candidates[cell] & bit);
    return {
      technique,
      placements: [],
      eliminations,
      highlights: {
        cells,
        units: [
          ...baseIndices.map((index) => ({ type: base, index })),
          ...coverIndices.map((index) => ({ type: cover, index })),
        ],
        digits: [digit],
      },
      explainKey: explainKey(technique),
      params: {
        digit,
        baseUnit: base,
        baseIndices: numberList(baseIndices.map((i) => i + 1)),
        coverUnit: cover,
        coverIndices: numberList(coverIndices.map((i) => i + 1)),
      },
    };
  }
  return null;
}

export const xWing: Technique = fish(2, 'xWing');
export const swordfish: Technique = fish(3, 'swordfish');
