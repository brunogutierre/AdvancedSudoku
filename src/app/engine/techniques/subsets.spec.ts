import { COLS, ROWS } from '../peers';
import { openState, pairs } from '../testing/states';
import type { Digit } from '../types';
import { combinations } from './combinations';
import { hiddenPair, hiddenTriple, nakedPair, nakedTriple } from './subsets';

const others = (unit: readonly number[], keep: number[]) => unit.filter((c) => !keep.includes(c));
const elims = (cells: number[], digits: Digit[]) =>
  cells.flatMap((cell) => digits.map((digit) => ({ cell, digit })));

describe('combinations', () => {
  it('yields every k-subset in order', () => {
    expect([...combinations([1, 2, 3, 4], 2)]).toEqual([
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
      [3, 4],
    ]);
    expect([...combinations([1, 2], 3)]).toEqual([]);
  });
});

describe('subsets', () => {
  it('find nothing on an open board', () => {
    for (const technique of [nakedPair, nakedTriple, hiddenPair, hiddenTriple]) {
      expect(technique(openState())).toBeNull();
    }
  });

  it('nakedPair removes the pair digits from the rest of the unit', () => {
    const s = openState().only(0, [2, 7]).only(5, [2, 7]);
    const step = nakedPair(s)!;
    expect(step.technique).toBe('nakedPair');
    expect(pairs(step.eliminations)).toEqual(pairs(elims(others(ROWS[0], [0, 5]), [2, 7])));
    expect(step.params).toEqual({ cells: 'R1C1, R1C6', digits: '2, 7', unit: 'row', unitIndex: 1 });
  });

  it('nakedPair is not reported when it eliminates nothing', () => {
    const rest = others(ROWS[0], [0, 5]);
    const s = openState().only(0, [2, 7]).only(5, [2, 7]).remove(2, rest).remove(7, rest);
    expect(nakedPair(s)).toBeNull();
  });

  it('nakedTriple handles cells that hold only two of the three digits', () => {
    const s = openState().only(63, [1, 2]).only(67, [2, 3]).only(71, [1, 3]);
    const step = nakedTriple(s)!;
    expect(pairs(step.eliminations)).toEqual(
      pairs(elims(others(ROWS[7], [63, 67, 71]), [1, 2, 3])),
    );
    expect(step.params).toEqual({
      cells: 'R8C1, R8C5, R8C9',
      digits: '1, 2, 3',
      unit: 'row',
      unitIndex: 8,
    });
  });

  it('hiddenPair strips the other candidates of the two cells', () => {
    const s = openState()
      .remove(3, others(ROWS[4], [36, 40]))
      .remove(8, others(ROWS[4], [36, 40]));
    const step = hiddenPair(s)!;
    expect(step.highlights.cells).toEqual([36, 40]);
    expect(pairs(step.eliminations)).toEqual(pairs(elims([36, 40], [1, 2, 4, 5, 6, 7, 9])));
    expect(step.params).toEqual({ cells: 'R5C1, R5C5', digits: '3, 8', unit: 'row', unitIndex: 5 });
  });

  it('hiddenTriple strips the other candidates of the three cells', () => {
    const keep = [2, 29, 74];
    const s = openState();
    for (const d of [4, 5, 6] as Digit[]) s.remove(d, others(COLS[2], keep));
    const step = hiddenTriple(s)!;
    expect(pairs(step.eliminations)).toEqual(pairs(elims(keep, [1, 2, 3, 7, 8, 9])));
    expect(step.params).toEqual({
      cells: 'R1C3, R4C3, R9C3',
      digits: '4, 5, 6',
      unit: 'col',
      unitIndex: 3,
    });
  });
});
