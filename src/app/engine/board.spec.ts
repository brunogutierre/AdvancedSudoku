import { maskOf } from './bits';
import {
  cellCandidates,
  cloneGrid,
  computeCandidates,
  conflicts,
  emptyGrid,
  filledCount,
  isComplete,
  parseGrid,
  serializeGrid,
} from './board';
import { KNOWN_PUZZLES } from './testing/fixtures';

const [wiki] = KNOWN_PUZZLES;

describe('board', () => {
  it('parses and serializes with "." and "0" as empty cells', () => {
    const grid = parseGrid(wiki.puzzle);
    expect(grid[0]).toBe(5);
    expect(grid[2]).toBe(0);
    expect(serializeGrid(grid, '0')).toBe(wiki.puzzle);
    expect(serializeGrid(grid)).toBe(wiki.puzzle.replaceAll('0', '.'));
    expect(parseGrid(serializeGrid(grid))).toEqual(grid);
  });

  it('ignores whitespace when parsing', () => {
    const multiline = wiki.puzzle.match(/.{9}/g)!.join('\n  ');
    expect(parseGrid(multiline)).toEqual(parseGrid(wiki.puzzle));
  });

  it('rejects bad input', () => {
    expect(() => parseGrid('123')).toThrow(/81 cells/);
    expect(() => parseGrid('x'.padEnd(81, '.'))).toThrow(/Invalid character "x" at cell 0/);
  });

  it('clones without sharing memory', () => {
    const grid = parseGrid(wiki.puzzle);
    const copy = cloneGrid(grid);
    copy[2] = 4;
    expect(grid[2]).toBe(0);
  });

  it('computes candidates from placed digits', () => {
    const grid = parseGrid(wiki.puzzle);
    // R1C3: row has 5,3,7; column has 8; box has 5,3,6,9,8 -> {1,2,4}
    expect(cellCandidates(grid, 2)).toBe(maskOf([1, 2, 4]));
    expect(cellCandidates(grid, 0)).toBe(0);
    const all = computeCandidates(grid);
    expect(all[2]).toBe(maskOf([1, 2, 4]));
    expect(all[0]).toBe(0);
    expect(computeCandidates(emptyGrid()).every((m) => m === 0x1ff)).toBe(true);
  });

  it('counts filled cells and detects completion', () => {
    expect(filledCount(emptyGrid())).toBe(0);
    expect(filledCount(parseGrid(wiki.puzzle))).toBe(30);
    expect(isComplete(parseGrid(wiki.solution))).toBe(true);
    expect(isComplete(parseGrid(wiki.puzzle))).toBe(false);
  });

  it('reports conflicting cells in rows, columns and boxes', () => {
    expect(conflicts(parseGrid(wiki.solution)).size).toBe(0);

    const grid = emptyGrid();
    grid[0] = 5;
    grid[8] = 5; // same row
    grid[72] = 5; // same column as cell 0
    grid[40] = 7;
    grid[30] = 7; // same box (box 4)
    grid[60] = 3; // alone
    expect([...conflicts(grid)].sort((a, b) => a - b)).toEqual([0, 8, 30, 40, 72]);

    const broken = parseGrid(wiki.solution);
    [broken[0], broken[1]] = [broken[1], broken[0]];
    expect(isComplete(broken)).toBe(false);
  });
});
