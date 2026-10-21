import { emptyGrid, filledCount, serializeGrid } from './board';
import type { Rng } from './prng';
import { createRng, shuffle } from './prng';
import { hasUniqueSolution, solveRandom } from './solver';
import { tierRank } from './techniques/ladder';
import { logicalSolve } from './techniques/logical';
import type { TechniqueId, Tier } from './techniques/step';
import type { Grid } from './types';

export interface GeneratedPuzzle {
  /** 81 chars, '.' for empty cells. */
  readonly puzzle: string;
  /** 81 digits. */
  readonly solution: string;
  /** Tier from the grader; equals the requested tier unless the fallback was used. */
  readonly tier: Tier;
  readonly seed: string;
}

export interface GenerateOptions {
  /** Attempts before giving up on the exact tier (default {@link MAX_ATTEMPTS}). */
  readonly maxAttempts?: number;
}

/**
 * Fewest givens allowed per tier. Easy puzzles keep more clues so they feel easy,
 * not just "solvable with singles".
 */
export const MIN_CLUES: Readonly<Record<Tier, number>> = {
  easy: 36,
  medium: 28,
  hard: 22,
  insane: 17,
};

/**
 * Attempt budget per tier. One attempt costs ~1-2 ms; measured hit rates per attempt are
 * ~100% easy, ~50% medium, ~0.4% hard (X-Wing and triples are rarely the bottleneck)
 * and ~30% insane, so hard needs a much larger budget.
 */
export const MAX_ATTEMPTS: Readonly<Record<Tier, number>> = {
  easy: 20,
  medium: 100,
  hard: 1000,
  insane: 300,
};

/** Cell pairs symmetric under a 180-degree rotation: (i, 80 - i). The center cell pairs with itself. */
const SYMMETRIC_PAIRS: readonly (readonly number[])[] = Array.from({ length: 41 }, (_, i) =>
  i === 40 ? [40] : [i, 80 - i],
);

interface Attempt {
  readonly puzzle: Grid;
  readonly solution: Grid;
  readonly tier: Tier;
}

/**
 * One generation attempt:
 * 1. Fill a random valid grid.
 * 2. Visit symmetric clue pairs in random order and remove each pair if the puzzle stays
 *    unique AND solvable with techniques up to the requested tier (so we never dig past it).
 * 3. Keep the last dug state whose grade was exactly the requested tier: digging further
 *    can make a puzzle need only easier techniques again, so the final state may fall short.
 */
function attempt(rng: Rng, tier: Tier): Attempt {
  const solution = solveRandom(emptyGrid(), rng)!;
  const puzzle = new Uint8Array(solution);
  const minClues = MIN_CLUES[tier];
  let atTier: Grid | null = null;
  let grade: Tier = 'easy';
  for (const pair of shuffle(rng, [...SYMMETRIC_PAIRS])) {
    if (filledCount(puzzle) - pair.length < minClues) continue;
    const saved = pair.map((cell) => puzzle[cell]);
    for (const cell of pair) puzzle[cell] = 0;
    // Uniqueness first: it is cheaper and rejects most removals near the end.
    const result = hasUniqueSolution(puzzle) ? logicalSolve(puzzle, tier) : null;
    if (!result?.solved) {
      pair.forEach((cell, i) => (puzzle[cell] = saved[i]));
      continue;
    }
    // Within `tier` the ladder takes the same path as the full ladder, so this is the real grade.
    grade = result.hardestTier;
    if (grade === tier) atTier = new Uint8Array(puzzle);
  }
  return grade !== tier && atTier
    ? { puzzle: atTier, solution, tier }
    : { puzzle, solution, tier: grade };
}

/**
 * Generates a unique-solution puzzle with 180-degree rotational symmetry whose hardest
 * required technique belongs exactly to `tier`. Deterministic for a given seed.
 * After `maxAttempts` misses it returns the hardest attempt that stayed below the tier.
 */
export function generatePuzzle(
  tier: Tier,
  seed: string,
  options: GenerateOptions = {},
): GeneratedPuzzle {
  const rng = createRng(`generate:${tier}:${seed}`);
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS[tier];
  let best: Attempt | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = attempt(rng, tier);
    if (candidate.tier === tier) return toGenerated(candidate, seed);
    if (!best || tierRank(candidate.tier) > tierRank(best.tier)) best = candidate;
  }
  return toGenerated(best!, seed);
}

function toGenerated(a: Attempt, seed: string): GeneratedPuzzle {
  return {
    puzzle: serializeGrid(a.puzzle),
    solution: serializeGrid(a.solution),
    tier: a.tier,
    seed,
  };
}

/** Insane techniques used by a puzzle, for the pre-generated bank. */
export function insaneTechniques(puzzle: Grid): TechniqueId[] {
  const used = new Set(logicalSolve(puzzle).steps.map((s) => s.technique));
  return (['swordfish', 'xyWing'] as const).filter((t) => used.has(t));
}
