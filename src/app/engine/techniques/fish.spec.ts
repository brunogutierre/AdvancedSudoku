import { cellAt, COLS, ROWS } from '../peers';
import { openState, pairs } from '../testing/states';
import { swordfish, xWing } from './fish';

describe('fish', () => {
  it('find nothing on an open board', () => {
    expect(xWing(openState())).toBeNull();
    expect(swordfish(openState())).toBeNull();
  });

  it('xWing on rows clears the two columns elsewhere', () => {
    // Digit 5 in rows 2 and 6 only in columns 2 and 7.
    const corners = [cellAt(1, 1), cellAt(1, 6), cellAt(5, 1), cellAt(5, 6)];
    const s = openState()
      .remove(
        5,
        ROWS[1].filter((c) => !corners.includes(c)),
      )
      .remove(
        5,
        ROWS[5].filter((c) => !corners.includes(c)),
      );
    const step = xWing(s)!;
    const expected = [...COLS[1], ...COLS[6]]
      .filter((c) => !corners.includes(c))
      .map((cell) => ({ cell, digit: 5 as const }));
    expect(pairs(step.eliminations)).toEqual(pairs(expected));
    expect(step.highlights.cells).toEqual(corners);
    expect(step.params).toEqual({
      digit: 5,
      baseUnit: 'row',
      baseIndices: '2, 6',
      coverUnit: 'col',
      coverIndices: '2, 7',
    });
  });

  it('swordfish on columns clears the three rows elsewhere', () => {
    // Digit 9: column 1 in rows {1,4}, column 5 in rows {4,7}, column 9 in rows {1,7}.
    const pattern: [number, number[]][] = [
      [0, [0, 3]],
      [4, [3, 6]],
      [8, [0, 6]],
    ];
    const s = openState();
    for (const [col, rows] of pattern)
      s.remove(
        9,
        COLS[col].filter((c) => !rows.includes(Math.floor(c / 9))),
      );
    expect(xWing(s)).toBeNull();
    const step = swordfish(s)!;
    const expected = [0, 3, 6]
      .flatMap((r) => ROWS[r].filter((c) => ![0, 4, 8].includes(c % 9)))
      .map((cell) => ({ cell, digit: 9 as const }));
    expect(pairs(step.eliminations)).toEqual(pairs(expected));
    expect(step.params).toEqual({
      digit: 9,
      baseUnit: 'col',
      baseIndices: '1, 5, 9',
      coverUnit: 'row',
      coverIndices: '1, 4, 7',
    });
  });
});
