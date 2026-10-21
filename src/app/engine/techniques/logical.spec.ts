import { computeCandidates, parseGrid } from '../board';
import { KNOWN_PUZZLES } from '../testing/fixtures';
import { minimalPuzzle } from '../testing/puzzles';
import type { Grid } from '../types';
import { LADDER, techniqueTier, tierRank } from './ladder';
import { applyStep, findStep, logicalSolve, nextStep } from './logical';
import type { Step, TechniqueId } from './step';

const wiki = KNOWN_PUZZLES[0];

/** Asserts a step is sound with respect to the known solution. */
function expectSound(step: Step, solution: Grid): void {
  for (const p of step.placements)
    expect(p.digit, `${step.technique} placement`).toBe(solution[p.cell]);
  for (const e of step.eliminations)
    expect(e.digit, `${step.technique} elimination`).not.toBe(solution[e.cell]);
  expect(step.placements.length + step.eliminations.length).toBeGreaterThan(0);
}

describe('ladder', () => {
  it('is ordered by tier', () => {
    const ranks = LADDER.map((r) => tierRank(r.tier));
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(techniqueTier('xyWing')).toBe('insane');
    expect(techniqueTier('hiddenSingle')).toBe('easy');
  });
});

describe('logicalSolve', () => {
  it('solves an easy puzzle with singles only', () => {
    const result = logicalSolve(parseGrid(wiki.puzzle));
    expect(result.solved).toBe(true);
    expect(result.hardestTier).toBe('easy');
    expect(result.grid).toEqual(parseGrid(wiki.solution));
    expect(result.steps.every((s) => s.placements.length === 1)).toBe(true);
  });

  it('reports "easy" and no steps for a solved grid', () => {
    const result = logicalSolve(parseGrid(wiki.solution));
    expect(result).toMatchObject({ solved: true, hardestTier: 'easy', steps: [] });
  });

  it('gets stuck on puzzles beyond the ladder and never guesses', () => {
    const inkala = KNOWN_PUZZLES[1];
    const result = logicalSolve(parseGrid(inkala.puzzle));
    expect(result.solved).toBe(false);
    for (const step of result.steps) expectSound(step, parseGrid(inkala.solution));
  });

  it('honors maxTier', () => {
    const { puzzle } = minimalPuzzle('maxTier');
    const result = logicalSolve(puzzle, 'easy');
    expect(result.steps.every((s) => techniqueTier(s.technique) === 'easy')).toBe(true);
  });
});

describe('technique soundness (property)', () => {
  // Minimal puzzles need advanced techniques; 120 seeds take ~0.5 s and hit every rung.
  const puzzles = Array.from({ length: 120 }, (_, i) => minimalPuzzle(`property:${i}`));
  const used = new Set<TechniqueId>();

  it('never places a wrong digit nor removes the solution digit', () => {
    for (const { puzzle, solution } of puzzles) {
      const result = logicalSolve(puzzle);
      for (const step of result.steps) {
        expectSound(step, solution);
        used.add(step.technique);
      }
      for (let i = 0; i < 81; i++)
        if (result.grid[i] !== 0) expect(result.grid[i]).toBe(solution[i]);
    }
    // The seeded sample is large enough to exercise every rung of the ladder.
    expect([...used].sort()).toEqual(LADDER.map((r) => r.id).sort());
  });

  it('keeps the solution digit in the candidates after every step', () => {
    for (const { puzzle, solution } of puzzles.slice(0, 10)) {
      const state = { grid: new Uint8Array(puzzle), candidates: computeCandidates(puzzle) };
      for (let step = findStep(state); step; step = findStep(state)) {
        applyStep(state, step);
        for (let i = 0; i < 81; i++) {
          if (state.grid[i] === 0)
            expect(state.candidates[i] & (1 << (solution[i] - 1))).not.toBe(0);
        }
      }
    }
  });
});

describe('nextStep', () => {
  const puzzle = parseGrid(wiki.puzzle);
  const solution = parseGrid(wiki.solution);

  it('returns the cheapest step for the current board', () => {
    const step = nextStep(puzzle, { solution })!;
    expect(['fullHouse', 'nakedSingle', 'hiddenSingle']).toContain(step.technique);
    expectSound(step, solution);
  });

  it('computes the solution when not given', () => {
    expect(nextStep(puzzle)).toEqual(nextStep(puzzle, { solution }));
  });

  it('returns null for a complete board', () => {
    expect(nextStep(solution)).toBeNull();
  });

  it('points at a wrong digit before anything else', () => {
    const board = new Uint8Array(puzzle);
    board[2] = 2; // R1C3 should be 4; 2 does not conflict with any given
    const step = nextStep(board, { solution })!;
    expect(step.technique).toBe('mistake');
    expect(step.explainKey).toBe('technique.mistake.wrongValue');
    expect(step.params).toEqual({ cell: 'R1C3' });
    expect(step.highlights.cells).toEqual([2]);
  });

  it('reports a contradiction with the conflicting cells when the solution is unknown', () => {
    const board = new Uint8Array(puzzle);
    board[2] = 5; // duplicates the 5 in R1C1
    const step = nextStep(board)!;
    expect(step.explainKey).toBe('technique.mistake.contradiction');
    expect(step.highlights.cells).toEqual([0, 2]);
    expect(step.params).toEqual({ cell: 'R1C1' });

    // Wrong but non-conflicting digit, no solution given: contradiction without cells.
    const subtle = new Uint8Array(puzzle);
    subtle[2] = 2;
    expect(nextStep(subtle)!.params).toEqual({});
  });

  it('points at a note that removed the solution digit', () => {
    const notes = computeCandidates(puzzle);
    notes[2] &= ~(1 << (4 - 1)); // R1C3 is 4
    const step = nextStep(puzzle, { solution, candidates: notes })!;
    expect(step.explainKey).toBe('technique.mistake.missingCandidate');
    expect(step.params).toEqual({ cell: 'R1C3' });
  });

  it('uses the player notes, ignoring cells without notes and stale marks', () => {
    // Only R1C3 is annotated, with a stale 5 and the real candidates {1,2,4}... reduced to {4}.
    const notes = new Uint16Array(81);
    notes[2] = (1 << 3) | (1 << 4); // {4, 5}: 5 is already in the row, so the effective note is {4}
    const step = nextStep(puzzle, { solution, candidates: notes })!;
    expect(step.technique).toBe('nakedSingle');
    expect(step.placements).toEqual([{ cell: 2, digit: 4 }]);
  });
});
