import type { CellIndex, UnitRef, UnitType } from './types';

/** Row (0..8) of each cell. */
export const ROW_OF: readonly number[] = Array.from({ length: 81 }, (_, i) => Math.floor(i / 9));
/** Column (0..8) of each cell. */
export const COL_OF: readonly number[] = Array.from({ length: 81 }, (_, i) => i % 9);
/** Box (0..8, row-major) of each cell. */
export const BOX_OF: readonly number[] = Array.from(
  { length: 81 },
  (_, i) => Math.floor(ROW_OF[i] / 3) * 3 + Math.floor(COL_OF[i] / 3),
);

function cellsWhere(predicate: (cell: CellIndex) => boolean): readonly CellIndex[] {
  return Array.from({ length: 81 }, (_, i) => i).filter(predicate);
}

/** Cells of each row, in ascending order. */
export const ROWS: readonly (readonly CellIndex[])[] = Array.from({ length: 9 }, (_, r) =>
  cellsWhere((i) => ROW_OF[i] === r),
);
/** Cells of each column, in ascending order. */
export const COLS: readonly (readonly CellIndex[])[] = Array.from({ length: 9 }, (_, c) =>
  cellsWhere((i) => COL_OF[i] === c),
);
/** Cells of each box, in ascending order. */
export const BOXES: readonly (readonly CellIndex[])[] = Array.from({ length: 9 }, (_, b) =>
  cellsWhere((i) => BOX_OF[i] === b),
);

/** All 27 units: rows 0..8, then columns (9..17), then boxes (18..26). */
export const UNITS: readonly (readonly CellIndex[])[] = [...ROWS, ...COLS, ...BOXES];

/** Indices into {@link UNITS} of the row, column and box of each cell. */
export const UNITS_OF_CELL: readonly (readonly [number, number, number])[] = Array.from(
  { length: 81 },
  (_, i) => [ROW_OF[i], 9 + COL_OF[i], 18 + BOX_OF[i]] as const,
);

/** The 20 cells sharing a row, column or box with each cell (the cell itself excluded). */
export const PEERS: readonly (readonly CellIndex[])[] = Array.from({ length: 81 }, (_, i) =>
  cellsWhere(
    (j) =>
      j !== i && (ROW_OF[j] === ROW_OF[i] || COL_OF[j] === COL_OF[i] || BOX_OF[j] === BOX_OF[i]),
  ),
);

/** Converts a {@link UNITS} index to a typed unit reference. */
export function unitRef(unitIndex: number): UnitRef {
  const type: UnitType = unitIndex < 9 ? 'row' : unitIndex < 18 ? 'col' : 'box';
  return { type, index: unitIndex % 9 };
}

/** Human-readable 1-based cell name, e.g. cell 0 is "R1C1" and cell 80 is "R9C9". */
export function cellName(cell: CellIndex): string {
  return `R${ROW_OF[cell] + 1}C${COL_OF[cell] + 1}`;
}

export function cellAt(row: number, col: number): CellIndex {
  return row * 9 + col;
}

export function isPeer(a: CellIndex, b: CellIndex): boolean {
  return a !== b && (ROW_OF[a] === ROW_OF[b] || COL_OF[a] === COL_OF[b] || BOX_OF[a] === BOX_OF[b]);
}
