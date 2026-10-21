import { parseGrid } from './board';
import { gradePuzzle } from './grader';
import { KNOWN_PUZZLES } from './testing/fixtures';

describe('gradePuzzle', () => {
  it('grades a singles-only puzzle as easy and counts techniques', () => {
    const grade = gradePuzzle(parseGrid(KNOWN_PUZZLES[0].puzzle));
    expect(grade.solvable).toBe(true);
    expect(grade.tier).toBe('easy');
    const total = Object.values(grade.techniques).reduce((a, b) => a + b, 0);
    expect(total).toBe(81 - 30);
  });

  it('marks puzzles beyond the ladder as not solvable', () => {
    expect(gradePuzzle(parseGrid(KNOWN_PUZZLES[1].puzzle)).solvable).toBe(false);
  });
});
