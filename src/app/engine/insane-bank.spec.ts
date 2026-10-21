import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGrid } from './board';
import { insaneTechniques } from './generator';
import { gradePuzzle } from './grader';
import { hasUniqueSolution } from './solver';

interface BankEntry {
  p: string;
  t: string;
}

describe('insane puzzle bank (public/puzzles/insane.json)', () => {
  const bank = JSON.parse(
    readFileSync(join(process.cwd(), 'public/puzzles/insane.json'), 'utf8'),
  ) as BankEntry[];

  it('has ~300 distinct, well-formed entries', () => {
    expect(bank.length).toBeGreaterThanOrEqual(300);
    expect(new Set(bank.map((e) => e.p)).size).toBe(bank.length);
    for (const entry of bank) {
      expect(entry.p).toMatch(/^[1-9.]{81}$/);
      expect(['swordfish', 'xyWing']).toContain(entry.t);
    }
  });

  it('holds unique-solution puzzles graded insane (sample)', () => {
    for (const entry of bank.filter((_, i) => i % 30 === 0)) {
      const grid = parseGrid(entry.p);
      expect(hasUniqueSolution(grid)).toBe(true);
      expect(gradePuzzle(grid)).toMatchObject({ solvable: true, tier: 'insane' });
      expect(insaneTechniques(grid)[0]).toBe(entry.t);
    }
  });
});
