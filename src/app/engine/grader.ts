import { logicalSolve } from './techniques/logical';
import type { TechniqueId, Tier } from './techniques/step';
import type { Grid } from './types';

export interface Grade {
  /** True when the technique ladder solves the puzzle without guessing. */
  readonly solvable: boolean;
  /** Tier of the hardest technique needed (meaningful only when solvable). */
  readonly tier: Tier;
  /** How many times each technique was used. */
  readonly techniques: Partial<Record<TechniqueId, number>>;
}

/** Grades a puzzle by solving it like a human with the technique ladder. */
export function gradePuzzle(puzzle: Grid): Grade {
  const result = logicalSolve(puzzle);
  const techniques: Partial<Record<TechniqueId, number>> = {};
  for (const step of result.steps)
    techniques[step.technique] = (techniques[step.technique] ?? 0) + 1;
  return { solvable: result.solved, tier: result.hardestTier, techniques };
}
