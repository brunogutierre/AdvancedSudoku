import type { CellView } from '../../../core';
import { cellViews } from '../../../core/game/game-selectors';
import { parseGrid } from '../../../engine';
import { KNOWN_PUZZLES } from '../../../engine/testing/fixtures';
import { diffBoard } from './board-events';

const wiki = KNOWN_PUZZLES[0];
const solution = parseGrid(wiki.solution);

function board(values: Uint8Array, notes = new Uint16Array(81)): CellView[] {
  return cellViews(
    { puzzle: parseGrid(wiki.puzzle), solution, values, notes, selected: null },
    { mistakeMode: 'conflicts', highlightPeers: false, highlightSameDigit: false },
  );
}

describe('diffBoard', () => {
  const start = parseGrid(wiki.puzzle);

  it('reports a placement, an erase and a note', () => {
    const placed = new Uint8Array(start);
    placed[2] = 4;
    expect(diffBoard(board(start), board(placed))).toEqual([{ type: 'place', cell: 2, digit: 4 }]);
    expect(diffBoard(board(placed), board(start))).toEqual([{ type: 'erase', cell: 2 }]);
    const notes = new Uint16Array(81);
    notes[2] = 0b1;
    expect(diffBoard(board(start), board(start, notes))).toEqual([{ type: 'note', cell: 2 }]);
  });

  it('reports conflicts with the clashing cells', () => {
    const clash = new Uint8Array(start);
    clash[2] = 5; // R1C1 holds a given 5
    expect(diffBoard(board(start), board(clash))).toEqual([
      { type: 'place', cell: 2, digit: 5 },
      { type: 'conflict', cells: [2, 0] },
    ]);
  });

  it('reports completed units and digits', () => {
    const before = new Uint8Array(solution);
    before[0] = 0;
    const events = diffBoard(board(before), board(solution));
    expect(events[0]).toEqual({ type: 'place', cell: 0, digit: 5 });
    expect(events.filter((e) => e.type === 'unit').length).toBe(3);
    expect(events.at(-1)).toMatchObject({ type: 'digit' });
  });

  it('ignores bulk changes', () => {
    const many = new Uint8Array(start);
    many[2] = 4;
    many[3] = 6;
    expect(diffBoard(board(start), board(many))).toEqual([]);
    const notes = new Uint16Array(81).fill(1);
    expect(diffBoard(board(start), board(start, notes))).toEqual([]);
  });
});
