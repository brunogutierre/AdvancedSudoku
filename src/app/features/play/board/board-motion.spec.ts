import { animateCells, MotionKind } from './board-motion';

describe('animateCells', () => {
  it.each<[MotionKind, number]>([
    ['pop', 2],
    ['note', 1],
    ['shake', 1],
    ['sweep', 2],
    ['pulse', 1],
    ['wave', 1],
  ])('%s animates the expected elements', (kind, calls) => {
    const cell = document.createElement('div');
    cell.innerHTML = '<span class="digit">5</span><span class="notes"></span>';
    const animate = vi.fn();
    cell.animate = animate;
    (cell.querySelector('.digit') as HTMLElement).animate = animate;
    (cell.querySelector('.notes') as HTMLElement).animate = animate;

    animateCells((i) => (i === 10 ? cell : null), kind, [10, 11]);
    expect(animate).toHaveBeenCalledTimes(calls);
  });

  it('staggers the win wave by row + column', () => {
    const cell = document.createElement('div');
    const animate = vi.fn();
    cell.animate = animate;
    animateCells(() => cell, 'wave', [80]);
    expect(animate.mock.calls[0][1]).toMatchObject({ delay: 16 * 18 });
  });
});
