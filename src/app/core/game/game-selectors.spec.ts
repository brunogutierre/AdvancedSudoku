import { maskOf, parseGrid } from '../../engine';
import { KNOWN_PUZZLES } from '../../engine/testing/fixtures';
import type { BoardSnapshot, CellViewOptions } from './game-selectors';
import { cellViews, digitCounts, flaggedCells, progress } from './game-selectors';

const wiki = KNOWN_PUZZLES[0];
const all: CellViewOptions = {
  mistakeMode: 'conflicts',
  highlightPeers: true,
  highlightSameDigit: true,
};

function board(overrides: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return {
    puzzle: parseGrid(wiki.puzzle),
    solution: parseGrid(wiki.solution),
    values: parseGrid(wiki.puzzle),
    notes: new Uint16Array(81),
    selected: null,
    ...overrides,
  };
}

describe('game selectors', () => {
  it('flags by mistake mode', () => {
    const values = parseGrid(wiki.puzzle);
    values[2] = 5; // conflicts with R1C1 and is wrong
    values[3] = 2; // wrong (R1C4 is 6) but no conflict
    const b = board({ values });
    expect([...flaggedCells(b, 'conflicts')].sort((x, y) => x - y)).toEqual([0, 2]);
    expect([...flaggedCells(b, 'solution')].sort((x, y) => x - y)).toEqual([2, 3]);
    expect(flaggedCells(b, 'off').size).toBe(0);
  });

  it('builds cell views with highlights', () => {
    const notes = new Uint16Array(81);
    notes[2] = maskOf([1, 4]);
    notes[1] = maskOf([9]); // hidden: R1C2 holds a given
    const cells = cellViews(board({ notes, selected: 0 }), all);
    expect(cells[0]).toMatchObject({
      index: 0,
      row: 0,
      col: 0,
      box: 0,
      value: 5,
      given: true,
      selected: true,
    });
    expect(cells[1]).toMatchObject({ isPeer: true, notes: 0 });
    expect(cells[2]).toMatchObject({ value: 0, given: false, notes: maskOf([1, 4]) });
    expect(cells[80].isPeer).toBe(false);
    const sameDigit = cells.filter((c) => c.sameDigit).map((c) => c.index);
    expect(sameDigit).toEqual(
      cells.filter((c) => c.value === 5 && c.index !== 0).map((c) => c.index),
    );

    const quiet = cellViews(board({ selected: 0 }), {
      ...all,
      highlightPeers: false,
      highlightSameDigit: false,
    });
    expect(quiet.some((c) => c.isPeer || c.sameDigit)).toBe(false);
    expect(cellViews(board({ selected: 2 }), all).some((c) => c.sameDigit)).toBe(false);
  });

  it('counts digits and progress', () => {
    const values = parseGrid(wiki.puzzle);
    expect(digitCounts(values)[5]).toBe(wiki.puzzle.split('5').length - 1);
    expect(digitCounts(values)[0]).toBe(0);
    expect(progress(parseGrid(wiki.puzzle), values)).toBe(0);
    values[2] = 4;
    expect(progress(parseGrid(wiki.puzzle), values)).toBeCloseTo(1 / 51);
    expect(progress(parseGrid(wiki.solution), parseGrid(wiki.solution))).toBe(0);
  });
});
