import type { CellIndex } from '../../../engine';

/**
 * Cell reached from `current` with a navigation key, without wrapping (grid pattern):
 * arrows move one cell, Home/End go to the row edges, Ctrl+Home/End to the first/last cell.
 * Returns null for other keys. With no selection, any navigation key starts at R1C1.
 */
export function navigate(current: CellIndex | null, key: string, ctrl = false): CellIndex | null {
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(key)) {
    return null;
  }
  if (current === null) {
    return 0;
  }
  const row = Math.floor(current / 9);
  const col = current % 9;
  switch (key) {
    case 'ArrowUp':
      return Math.max(row - 1, 0) * 9 + col;
    case 'ArrowDown':
      return Math.min(row + 1, 8) * 9 + col;
    case 'ArrowLeft':
      return row * 9 + Math.max(col - 1, 0);
    case 'ArrowRight':
      return row * 9 + Math.min(col + 1, 8);
    case 'Home':
      return ctrl ? 0 : row * 9;
    default:
      return ctrl ? 80 : row * 9 + 8;
  }
}
