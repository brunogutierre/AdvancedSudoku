import { filledCount, parseGrid, serializeGrid } from './board';
import { generatePuzzle, insaneTechniques, MIN_CLUES } from './generator';
import { gradePuzzle } from './grader';
import { countSolutions, solve } from './solver';
import { tierRank } from './techniques/ladder';
import type { Tier } from './techniques/step';

function expectValid(puzzle: string, solution: string): void {
  const grid = parseGrid(puzzle);
  expect(countSolutions(grid)).toBe(1);
  expect(serializeGrid(solve(grid)!)).toBe(solution);
  for (let i = 0; i < 81; i++) {
    // 180-degree rotational symmetry of the givens.
    expect(grid[i] === 0, `cell ${i}`).toBe(grid[80 - i] === 0);
  }
}

describe('generatePuzzle', () => {
  // Seeds picked to hit their tier within a few attempts, so the suite stays fast under coverage.
  const SEEDS: [Tier, string][] = [
    ['easy', 'spec'],
    ['medium', 'spec'],
    ['hard', 'spec4'],
  ];
  for (const [tier, seed] of SEEDS) {
    it(`generates a unique, symmetric ${tier} puzzle graded exactly ${tier}`, () => {
      const generated = generatePuzzle(tier, seed);
      expect(generated.tier).toBe(tier);
      expect(generated.seed).toBe(seed);
      expectValid(generated.puzzle, generated.solution);
      const grid = parseGrid(generated.puzzle);
      expect(filledCount(grid)).toBeGreaterThanOrEqual(MIN_CLUES[tier]);
      expect(gradePuzzle(grid)).toMatchObject({ solvable: true, tier });
    }, 20_000);
  }

  it('is deterministic per seed', () => {
    expect(generatePuzzle('medium', 'a')).toEqual(generatePuzzle('medium', 'a'));
    expect(generatePuzzle('medium', 'a').puzzle).not.toBe(generatePuzzle('medium', 'b').puzzle);
  });

  it('falls back to the hardest attempt below the tier when the budget runs out', () => {
    const generated = generatePuzzle('hard', 'fallback', { maxAttempts: 1 });
    expectValid(generated.puzzle, generated.solution);
    expect(tierRank(generated.tier)).toBeLessThanOrEqual(tierRank('hard'));
    expect(gradePuzzle(parseGrid(generated.puzzle)).tier).toBe(generated.tier);
  });

  it('generates insane puzzles and names their insane techniques', () => {
    const generated = generatePuzzle('insane', 'spec');
    expect(generated.tier).toBe('insane');
    expectValid(generated.puzzle, generated.solution);
    const techniques = insaneTechniques(parseGrid(generated.puzzle));
    expect(techniques.length).toBeGreaterThan(0);
    expect(insaneTechniques(parseGrid(generatePuzzle('easy', 'x').puzzle))).toEqual([]);
  });
});
