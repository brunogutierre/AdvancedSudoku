import {
  BOX_OF,
  BOXES,
  cellAt,
  cellName,
  COL_OF,
  COLS,
  isPeer,
  PEERS,
  ROW_OF,
  ROWS,
  UNITS,
  UNITS_OF_CELL,
  unitRef,
} from './peers';

describe('peers', () => {
  it('builds 27 units of 9 distinct cells covering the grid three times', () => {
    expect(UNITS).toHaveLength(27);
    const coverage = new Array<number>(81).fill(0);
    for (const unit of UNITS) {
      expect(new Set(unit).size).toBe(9);
      for (const cell of unit) coverage[cell]++;
    }
    expect(coverage.every((n) => n === 3)).toBe(true);
  });

  it('computes row, column and box of a cell', () => {
    const cell = cellAt(4, 7);
    expect(cell).toBe(43);
    expect(ROW_OF[cell]).toBe(4);
    expect(COL_OF[cell]).toBe(7);
    expect(BOX_OF[cell]).toBe(5);
    expect(ROWS[4]).toContain(cell);
    expect(COLS[7]).toContain(cell);
    expect(BOXES[5]).toEqual([33, 34, 35, 42, 43, 44, 51, 52, 53]);
    expect(UNITS_OF_CELL[cell]).toEqual([4, 16, 23]);
  });

  it('gives every cell 20 peers, excluding itself, symmetrically', () => {
    for (let i = 0; i < 81; i++) {
      expect(PEERS[i]).toHaveLength(20);
      expect(PEERS[i]).not.toContain(i);
      for (const p of PEERS[i]) {
        expect(PEERS[p]).toContain(i);
        expect(isPeer(i, p)).toBe(true);
      }
    }
    expect(isPeer(0, 0)).toBe(false);
    expect(isPeer(0, 80)).toBe(false);
  });

  it('names cells and units', () => {
    expect(cellName(0)).toBe('R1C1');
    expect(cellName(80)).toBe('R9C9');
    expect(cellName(cellAt(2, 4))).toBe('R3C5');
    expect(unitRef(3)).toEqual({ type: 'row', index: 3 });
    expect(unitRef(12)).toEqual({ type: 'col', index: 3 });
    expect(unitRef(26)).toEqual({ type: 'box', index: 8 });
  });
});
