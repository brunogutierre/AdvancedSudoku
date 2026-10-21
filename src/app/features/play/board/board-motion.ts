import type { CellIndex } from '../../../engine';

export type MotionKind = 'pop' | 'note' | 'shake' | 'sweep' | 'pulse' | 'wave';

const SPRING = 'linear(0, 0.5 7%, 1.06 18%, 1.02 26%, 0.99 40%, 1)';
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const FILL = (color: string) => `inset 0 0 0 200px ${color}`;
const CLEAR = 'inset 0 0 0 200px transparent';

/**
 * Board micro-animations with the Web Animations API: no class toggling or reflow tricks to
 * restart CSS animations, and nothing to clean up. Callers skip this under reduced motion.
 */
export function animateCells(
  find: (cell: CellIndex) => HTMLElement | null,
  kind: MotionKind,
  cells: readonly CellIndex[],
): void {
  cells.forEach((cell, i) => {
    const el = find(cell);
    if (!el?.animate) {
      return;
    }
    const digit = el.querySelector<HTMLElement>('.digit');
    switch (kind) {
      case 'pop':
        digit?.animate(
          [
            { transform: 'scale(0.6)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1 },
          ],
          { duration: 220, easing: SPRING },
        );
        el.animate([{ boxShadow: FILL('var(--primary-tint)') }, { boxShadow: CLEAR }], {
          duration: 160,
          easing: EASE_OUT,
        });
        return;
      case 'note':
        el.querySelector<HTMLElement>('.notes')?.animate(
          [
            { transform: 'scale(0.7)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1 },
          ],
          { duration: 140, easing: EASE_OUT },
        );
        return;
      case 'shake':
        el.animate(
          ['0', '-4px', '4px', '-3px', '3px', '0'].map((x) => ({ transform: `translateX(${x})` })),
          { duration: 280, easing: EASE_OUT },
        );
        return;
      case 'sweep':
        el.animate(
          [
            { boxShadow: CLEAR },
            { boxShadow: FILL('var(--cell-sweep)'), offset: 0.4 },
            { boxShadow: CLEAR },
          ],
          { duration: 660, delay: i * 30, easing: EASE_OUT },
        );
        digit?.animate(
          [
            { transform: 'none' },
            { transform: 'translateY(-2px)', offset: 0.4 },
            { transform: 'none' },
          ],
          { duration: 660, delay: i * 30 },
        );
        return;
      case 'pulse':
        el.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
          {
            duration: 260,
            delay: i * 40,
            easing: EASE_OUT,
          },
        );
        return;
      case 'wave': {
        const delay = (Math.floor(cell / 9) + (cell % 9)) * 18;
        el.animate(
          [
            { boxShadow: CLEAR, transform: 'scale(1)' },
            { boxShadow: FILL('var(--cell-sweep)'), transform: 'scale(0.94)', offset: 0.4 },
            { boxShadow: CLEAR, transform: 'scale(1)' },
          ],
          { duration: 420, delay, easing: EASE_OUT },
        );
        return;
      }
    }
  });
}
