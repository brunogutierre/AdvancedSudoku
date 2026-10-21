import { ALL_CANDIDATES, digitsOf, popcount } from './bits';
import { BOX_OF, COL_OF, ROW_OF } from './peers';
import type { Rng } from './prng';
import { shuffle } from './prng';
import type { Grid } from './types';
import { GRID_SIZE } from './types';

interface SearchResult {
  readonly count: number;
  readonly first: Grid | null;
}

/**
 * Depth-first search with bitmasks and the "minimum remaining values" heuristic:
 * at each level the empty cell with the fewest candidates is tried first, which
 * keeps the tree tiny for valid puzzles (forced cells are filled without branching).
 *
 * Stops as soon as `limit` solutions have been found.
 * When `rng` is given, digits are tried in random order (used to build random full grids).
 */
function search(puzzle: Grid, limit: number, rng?: Rng): SearchResult {
  const grid = new Uint8Array(puzzle);
  const rows = new Int32Array(9);
  const cols = new Int32Array(9);
  const boxes = new Int32Array(9);
  const empties: number[] = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    const v = grid[i];
    if (v === 0) {
      empties.push(i);
      continue;
    }
    const bit = 1 << (v - 1);
    const r = ROW_OF[i];
    const c = COL_OF[i];
    const b = BOX_OF[i];
    if ((rows[r] | cols[c] | boxes[b]) & bit) return { count: 0, first: null };
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
  }

  const total = empties.length;
  let count = 0;
  let first: Grid | null = null;

  const recurse = (depth: number): void => {
    if (depth === total) {
      count++;
      first ??= new Uint8Array(grid);
      return;
    }

    // Pick the most constrained empty cell among empties[depth..].
    let bestK = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (let k = depth; k < total; k++) {
      const cell = empties[k];
      const mask =
        ALL_CANDIDATES & ~(rows[ROW_OF[cell]] | cols[COL_OF[cell]] | boxes[BOX_OF[cell]]);
      const n = popcount(mask);
      if (n < bestCount) {
        bestCount = n;
        bestMask = mask;
        bestK = k;
        if (n <= 1) break;
      }
    }
    if (bestCount === 0) return;

    // Move the chosen cell to position `depth`; deeper levels only look at empties[depth + 1..].
    const cell = empties[bestK];
    empties[bestK] = empties[depth];
    empties[depth] = cell;

    const r = ROW_OF[cell];
    const c = COL_OF[cell];
    const b = BOX_OF[cell];
    const digits = rng ? shuffle(rng, digitsOf(bestMask)) : digitsOf(bestMask);
    for (const d of digits) {
      const bit = 1 << (d - 1);
      grid[cell] = d;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      recurse(depth + 1);
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
      grid[cell] = 0;
      if (count >= limit) break;
    }
  };

  recurse(0);
  return { count, first };
}

/**
 * Returns a solution of the puzzle, or `null` if it has none (including puzzles
 * whose givens already break a rule). Does not check uniqueness.
 */
export function solve(puzzle: Grid): Grid | null {
  return search(puzzle, 1).first;
}

/**
 * Like {@link solve}, but tries digits in random order. On an empty grid this
 * produces a uniformly shuffled, valid full grid driven by the given generator.
 */
export function solveRandom(puzzle: Grid, rng: Rng): Grid | null {
  return search(puzzle, 1, rng).first;
}

/**
 * Counts solutions up to `limit` (default 2, which is all a uniqueness check needs).
 * Returns 0 for contradictory puzzles.
 */
export function countSolutions(puzzle: Grid, limit = 2): number {
  return search(puzzle, limit).count;
}

/** True when the puzzle has exactly one solution. */
export function hasUniqueSolution(puzzle: Grid): boolean {
  return countSolutions(puzzle, 2) === 1;
}
