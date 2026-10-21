import { ALL_CANDIDATES } from './bits';
import { PEERS, UNITS } from './peers';
import type { CandidateGrid, CandidateMask, CellIndex, Grid } from './types';
import { GRID_SIZE } from './types';

/** A new grid with every cell empty. */
export function emptyGrid(): Grid {
  return new Uint8Array(GRID_SIZE);
}

/**
 * Parses an 81-character puzzle string in row-major order.
 * Digits `1-9` are placed values; `.` and `0` are empty cells.
 * Whitespace is ignored so multi-line literals can be used in tests.
 * @throws {Error} when the string has the wrong length or an unexpected character.
 */
export function parseGrid(text: string): Grid {
  const compact = text.replace(/\s+/g, '');
  if (compact.length !== GRID_SIZE) {
    throw new Error(`Expected 81 cells, got ${compact.length}`);
  }
  const grid = emptyGrid();
  for (let i = 0; i < GRID_SIZE; i++) {
    const ch = compact.charCodeAt(i);
    if (ch >= 49 && ch <= 57) {
      grid[i] = ch - 48;
    } else if (ch !== 46 && ch !== 48) {
      throw new Error(`Invalid character "${compact[i]}" at cell ${i}`);
    }
  }
  return grid;
}

/** Serializes a grid to 81 characters, using `empty` for empty cells. */
export function serializeGrid(grid: Grid, empty: '.' | '0' = '.'): string {
  let out = '';
  for (let i = 0; i < GRID_SIZE; i++) out += grid[i] === 0 ? empty : String(grid[i]);
  return out;
}

export function cloneGrid(grid: Grid): Grid {
  return new Uint8Array(grid);
}

/** Candidates of one cell given the digits already placed in its peers (0 if the cell is filled). */
export function cellCandidates(grid: Grid, cell: CellIndex): CandidateMask {
  if (grid[cell] !== 0) return 0;
  let used = 0;
  for (const peer of PEERS[cell]) {
    const v = grid[peer];
    if (v !== 0) used |= 1 << (v - 1);
  }
  return ALL_CANDIDATES & ~used;
}

/** Candidate mask of every cell computed from the placed digits only (no advanced eliminations). */
export function computeCandidates(grid: Grid): CandidateGrid {
  const candidates = new Uint16Array(GRID_SIZE);
  for (let i = 0; i < GRID_SIZE; i++) candidates[i] = cellCandidates(grid, i);
  return candidates;
}

/** Number of non-empty cells. */
export function filledCount(grid: Grid): number {
  let count = 0;
  for (let i = 0; i < GRID_SIZE; i++) if (grid[i] !== 0) count++;
  return count;
}

/** Cells holding a digit that also appears in one of their peers. */
export function conflicts(grid: Grid): Set<CellIndex> {
  const result = new Set<CellIndex>();
  for (const unit of UNITS) {
    // First cell seen per digit in this unit; -1 = not seen yet.
    const firstSeen = new Int8Array(10).fill(-1);
    for (const cell of unit) {
      const v = grid[cell];
      if (v === 0) continue;
      const first = firstSeen[v];
      if (first === -1) {
        firstSeen[v] = cell;
      } else {
        result.add(first);
        result.add(cell);
      }
    }
  }
  return result;
}

/** True when every cell is filled and no rule is broken. */
export function isComplete(grid: Grid): boolean {
  return filledCount(grid) === GRID_SIZE && conflicts(grid).size === 0;
}
