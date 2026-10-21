import { emptyGrid } from '../board';
import { createRng, shuffle } from '../prng';
import { hasUniqueSolution, solveRandom } from '../solver';
import type { Grid } from '../types';

/**
 * A random minimal puzzle: start from a seeded full grid and remove clues in random
 * order while the solution stays unique. Minimal puzzles exercise every technique.
 */
export function minimalPuzzle(seed: string): { puzzle: Grid; solution: Grid } {
  const rng = createRng(seed);
  const solution = solveRandom(emptyGrid(), rng)!;
  const puzzle = new Uint8Array(solution);
  for (const cell of shuffle(
    rng,
    Array.from({ length: 81 }, (_, i) => i),
  )) {
    const digit = puzzle[cell];
    puzzle[cell] = 0;
    if (!hasUniqueSolution(puzzle)) puzzle[cell] = digit;
  }
  return { puzzle, solution };
}
