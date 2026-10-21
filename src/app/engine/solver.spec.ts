import { emptyGrid, isComplete, parseGrid, serializeGrid } from './board';
import { createRng } from './prng';
import { countSolutions, hasUniqueSolution, solve, solveRandom } from './solver';
import { KNOWN_PUZZLES } from './testing/fixtures';

describe('solver', () => {
  for (const known of KNOWN_PUZZLES) {
    it(`solves ${known.name}`, () => {
      const puzzle = parseGrid(known.puzzle);
      const solution = solve(puzzle);
      expect(solution).not.toBeNull();
      expect(serializeGrid(solution!)).toBe(known.solution);
      expect(countSolutions(puzzle)).toBe(1);
      expect(hasUniqueSolution(puzzle)).toBe(true);
    });
  }

  it('does not modify its input', () => {
    const puzzle = parseGrid(KNOWN_PUZZLES[0].puzzle);
    const before = serializeGrid(puzzle);
    solve(puzzle);
    expect(serializeGrid(puzzle)).toBe(before);
  });

  it('returns a solved grid unchanged', () => {
    const solved = KNOWN_PUZZLES[0].solution;
    expect(serializeGrid(solve(parseGrid(solved))!)).toBe(solved);
    expect(countSolutions(parseGrid(solved))).toBe(1);
  });

  it('detects multiple solutions and honors the limit', () => {
    expect(countSolutions(emptyGrid())).toBe(2);
    expect(countSolutions(emptyGrid(), 5)).toBe(5);
    expect(hasUniqueSolution(emptyGrid())).toBe(false);
    // "Deadly rectangle": R1C4=6 R1C5=7 / R4C4=7 R4C5=6 can be swapped, so emptying them leaves 2 solutions.
    const deadly = parseGrid(KNOWN_PUZZLES[0].solution);
    for (const cell of [3, 4, 30, 31]) deadly[cell] = 0;
    expect(countSolutions(deadly, 10)).toBe(2);
  });

  it('returns null / 0 for invalid puzzles', () => {
    const duplicate = parseGrid('55'.padEnd(81, '.'));
    expect(solve(duplicate)).toBeNull();
    expect(countSolutions(duplicate)).toBe(0);

    // No direct conflict, but R1C9 has no candidate left: row holds 1-8 and column 9 holds a 9.
    const dead = parseGrid('12345678.' + '........9' + '.'.repeat(63));
    expect(solve(dead)).toBeNull();
    expect(countSolutions(dead)).toBe(0);
  });

  it('builds random valid full grids deterministically from a seed', () => {
    const a = solveRandom(emptyGrid(), createRng('full'))!;
    const b = solveRandom(emptyGrid(), createRng('full'))!;
    const c = solveRandom(emptyGrid(), createRng('other'))!;
    expect(isComplete(a)).toBe(true);
    expect(serializeGrid(a)).toBe(serializeGrid(b));
    expect(serializeGrid(a)).not.toBe(serializeGrid(c));
  });
});
