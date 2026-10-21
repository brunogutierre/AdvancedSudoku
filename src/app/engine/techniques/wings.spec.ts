import { openState } from '../testing/states';
import { xyWing } from './wings';

describe('xyWing', () => {
  it('finds nothing on an open board', () => {
    expect(xyWing(openState())).toBeNull();
  });

  it('removes z from cells seeing both pincers', () => {
    // Pivot R5C5 {1,2}, pincers R5C1 {1,3} and R1C5 {2,3}: R1C1 sees both pincers.
    const s = openState().only(40, [1, 2]).only(36, [1, 3]).only(4, [2, 3]);
    const step = xyWing(s)!;
    expect(step.eliminations).toEqual([{ cell: 0, digit: 3 }]);
    expect(step.highlights.cells).toEqual([40, 36, 4]);
    expect(step.params).toEqual({
      pivot: 'R5C5',
      pincer1: 'R5C1',
      pincer2: 'R1C5',
      x: 1,
      y: 2,
      z: 3,
    });
  });

  it('is not reported when nothing can be eliminated', () => {
    const s = openState().only(40, [1, 2]).only(36, [1, 3]).only(4, [2, 3]).remove(3, [0]);
    expect(xyWing(s)).toBeNull();
  });
});
