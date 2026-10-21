import { computeCandidates, conflicts } from '../board';
import { cellName, PEERS } from '../peers';
import { solve } from '../solver';
import type { CandidateGrid, CellIndex, Grid } from '../types';
import { GRID_SIZE } from '../types';
import { LADDER, techniqueTier, TIERS, tierRank } from './ladder';
import type { CandidateState, Step, TechniqueStep, Tier } from './step';
import { explainKey } from './step';

/** First step found by the cheapest applicable technique up to `maxTier`, or null when stuck. */
export function findStep(state: CandidateState, maxTier: Tier = 'insane'): TechniqueStep | null {
  const limit = tierRank(maxTier);
  for (const rung of LADDER) {
    if (tierRank(rung.tier) > limit) break;
    const step = rung.find(state);
    if (step) return step;
  }
  return null;
}

/** Applies a step in place: placements also clear that digit from the peers' candidates. */
export function applyStep(state: CandidateState, step: Step): void {
  const { grid, candidates } = state;
  for (const { cell, digit } of step.placements) {
    const bit = 1 << (digit - 1);
    grid[cell] = digit;
    candidates[cell] = 0;
    for (const peer of PEERS[cell]) candidates[peer] &= ~bit;
  }
  for (const { cell, digit } of step.eliminations) candidates[cell] &= ~(1 << (digit - 1));
}

export interface LogicalSolveResult {
  /** Steps in the order they were applied. */
  readonly steps: TechniqueStep[];
  /** True when the ladder filled every cell. */
  readonly solved: boolean;
  /** Tier of the hardest technique used ('easy' when no step was needed). */
  readonly hardestTier: Tier;
  /** The grid as far as the ladder got. */
  readonly grid: Grid;
}

/** Solves like a human would, using only the technique ladder (no guessing). */
export function logicalSolve(puzzle: Grid, maxTier: Tier = 'insane'): LogicalSolveResult {
  const state: CandidateState = {
    grid: new Uint8Array(puzzle),
    candidates: computeCandidates(puzzle),
  };
  const steps: TechniqueStep[] = [];
  let hardest = 0;
  let empty = state.grid.reduce((n, v) => (v === 0 ? n + 1 : n), 0);
  while (empty > 0) {
    const step = findStep(state, maxTier);
    if (!step) break;
    applyStep(state, step);
    steps.push(step);
    empty -= step.placements.length;
    hardest = Math.max(hardest, tierRank(techniqueTier(step.technique)));
  }
  return { steps, solved: empty === 0, hardestTier: TIERS[hardest], grid: state.grid };
}

export interface NextStepOptions {
  /**
   * The player's pencil marks. A cell with 0 means "no notes" and falls back to the
   * candidates computed from placed digits; other masks are intersected with them so
   * stale notes never produce a wrong deduction.
   */
  readonly candidates?: CandidateGrid;
  /** The puzzle's solution, to point at wrong digits and wrong notes. Computed when omitted. */
  readonly solution?: Grid;
  readonly maxTier?: Tier;
}

function mistake(
  variant: 'wrongValue' | 'missingCandidate' | 'contradiction',
  cells: CellIndex[],
): Step {
  return {
    technique: 'mistake',
    placements: [],
    eliminations: [],
    highlights: { cells, units: [], digits: [] },
    explainKey: explainKey('mistake', variant),
    params: cells.length > 0 ? { cell: cellName(cells[0]) } : {},
  };
}

/**
 * The hint for the player's current board: a `mistake` step when a placed digit or a
 * pencil mark contradicts the solution, otherwise the cheapest logical step.
 * Returns null when the board is complete or no technique applies.
 */
export function nextStep(grid: Grid, options: NextStepOptions = {}): Step | null {
  const solution = options.solution ?? solve(grid);
  if (!solution) {
    return mistake(
      'contradiction',
      [...conflicts(grid)].sort((a, b) => a - b),
    );
  }
  for (let cell = 0; cell < GRID_SIZE; cell++) {
    if (grid[cell] !== 0 && grid[cell] !== solution[cell]) return mistake('wrongValue', [cell]);
  }

  const candidates = computeCandidates(grid);
  const notes = options.candidates;
  for (let cell = 0; cell < GRID_SIZE; cell++) {
    if (grid[cell] !== 0) continue;
    if (notes && notes[cell] !== 0) candidates[cell] &= notes[cell];
    if ((candidates[cell] & (1 << (solution[cell] - 1))) === 0)
      return mistake('missingCandidate', [cell]);
  }

  return findStep({ grid: new Uint8Array(grid), candidates }, options.maxTier);
}
