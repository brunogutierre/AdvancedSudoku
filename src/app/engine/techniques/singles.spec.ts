import { BOXES, ROWS } from '../peers';
import { openState } from '../testing/states';
import { fullHouse, hiddenSingle, nakedSingle } from './singles';

describe('singles', () => {
  it('finds nothing on an open board', () => {
    const s = openState();
    expect(fullHouse(s)).toBeNull();
    expect(nakedSingle(s)).toBeNull();
    expect(hiddenSingle(s)).toBeNull();
  });

  it('fullHouse fills the last cell of a unit', () => {
    const s = openState();
    ROWS[2].slice(0, 8).forEach((cell, i) => s.place(cell, (i + 1) as 1));
    const step = fullHouse(s)!;
    expect(step.placements).toEqual([{ cell: 26, digit: 9 }]);
    expect(step.params).toEqual({ cell: 'R3C9', digit: 9, unit: 'row', unitIndex: 3 });
    expect(step.explainKey).toBe('technique.fullHouse.explain');
  });

  it('fullHouse ignores a last cell whose candidates exclude the missing digit', () => {
    const s = openState();
    ROWS[2].slice(0, 8).forEach((cell, i) => s.place(cell, (i + 1) as 1));
    s.remove(9, [26]);
    expect(fullHouse(s)).toBeNull();
  });

  it('nakedSingle places the only candidate', () => {
    const step = nakedSingle(openState().only(40, [7]))!;
    expect(step.placements).toEqual([{ cell: 40, digit: 7 }]);
    expect(step.params).toEqual({ cell: 'R5C5', digit: 7 });
  });

  it('hiddenSingle finds a digit with one place in a box', () => {
    const s = openState().remove(
      4,
      BOXES[8].filter((c) => c !== 70),
    );
    const step = hiddenSingle(s)!;
    expect(step.placements).toEqual([{ cell: 70, digit: 4 }]);
    expect(step.highlights.units).toEqual([{ type: 'box', index: 8 }]);
    expect(step.params).toEqual({ cell: 'R8C8', digit: 4, unit: 'box', unitIndex: 9 });
  });

  it('hiddenSingle finds a digit with one place in a row and skips placed digits', () => {
    const s = openState().place(0, 3);
    // Digit 3 is placed in row 1: it must not be reported for the other cells even though it is "missing".
    s.remove(3, ROWS[0]);
    expect(hiddenSingle(s)).toBeNull();
    s.remove(
      6,
      ROWS[4].filter((c) => c !== 44),
    );
    expect(hiddenSingle(s)!.params).toEqual({ cell: 'R5C9', digit: 6, unit: 'row', unitIndex: 5 });
  });
});
