import { BOXES } from '../peers';
import { openState } from '../testing/states';
import { boxLineReduction, pointing } from './intersections';

describe('intersections', () => {
  it('find nothing on an open board', () => {
    expect(pointing(openState())).toBeNull();
    expect(boxLineReduction(openState())).toBeNull();
  });

  it('pointing: digit locked on a row inside a box clears the row outside the box', () => {
    // Box 1 (top-left): digit 5 only in R1C1 and R1C2.
    const s = openState().remove(
      5,
      BOXES[0].filter((c) => c !== 0 && c !== 1),
    );
    const step = pointing(s)!;
    expect(step.technique).toBe('pointing');
    expect(step.eliminations.map((e) => e.cell)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(step.eliminations.every((e) => e.digit === 5)).toBe(true);
    expect(step.params).toEqual({ digit: 5, box: 1, unit: 'row', unitIndex: 1 });
    expect(step.highlights.cells).toEqual([0, 1]);
  });

  it('pointing: works on columns too', () => {
    // Box 5 (center): digit 2 only in R4C5 and R6C5 (cells 31, 49).
    const s = openState().remove(
      2,
      BOXES[4].filter((c) => c !== 31 && c !== 49),
    );
    const step = pointing(s)!;
    expect(step.params).toEqual({ digit: 2, box: 5, unit: 'col', unitIndex: 5 });
    expect(step.eliminations.map((e) => e.cell)).toEqual([4, 13, 22, 58, 67, 76]);
  });

  it('boxLineReduction: digit locked in a box inside a row clears the rest of the box', () => {
    // Row 1: digit 8 only in R1C4..R1C6 (box 2).
    const s = openState().remove(8, [0, 1, 2, 6, 7, 8]);
    const step = boxLineReduction(s)!;
    expect(step.technique).toBe('boxLineReduction');
    expect(step.eliminations.map((e) => e.cell)).toEqual([12, 13, 14, 21, 22, 23]);
    expect(step.params).toEqual({ digit: 8, box: 2, unit: 'row', unitIndex: 1 });
  });

  it('boxLineReduction: works on columns too', () => {
    // Column 9: digit 1 only in R7C9..R9C9 (box 9).
    const s = openState().remove(1, [8, 17, 26, 35, 44, 53]);
    const step = boxLineReduction(s)!;
    expect(step.params).toEqual({ digit: 1, box: 9, unit: 'col', unitIndex: 9 });
    expect(step.eliminations.map((e) => e.cell)).toEqual([60, 61, 69, 70, 78, 79]);
  });
});
