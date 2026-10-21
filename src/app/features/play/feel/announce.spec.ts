import { cellViews } from '../../../core/game/game-selectors';
import { BOXES, COLS, ROWS, parseGrid } from '../../../engine';
import { KNOWN_PUZZLES } from '../../../engine/testing/fixtures';
import { announcementsFor } from './announce';

const wiki = KNOWN_PUZZLES[0];
const cells = cellViews(
  {
    puzzle: parseGrid(wiki.puzzle),
    solution: parseGrid(wiki.solution),
    values: parseGrid(wiki.solution),
    notes: new Uint16Array(81),
    selected: null,
  },
  { mistakeMode: 'conflicts', highlightPeers: false, highlightSameDigit: false },
);

describe('announcementsFor', () => {
  it('announces placements, erasures, units and digits with 1-based positions', () => {
    expect(
      announcementsFor(
        [
          { type: 'place', cell: 10, digit: 7 },
          { type: 'unit', cells: ROWS[1] },
          { type: 'unit', cells: COLS[1] },
          { type: 'unit', cells: BOXES[0] },
          { type: 'digit', cells: [10] },
          { type: 'note', cell: 3 },
        ],
        cells,
      ),
    ).toEqual([
      { key: 'play.live.placed', params: { digit: 7, row: 2, col: 2 } },
      { key: 'play.live.row', params: { n: 2 } },
      { key: 'play.live.col', params: { n: 2 } },
      { key: 'play.live.box', params: { n: 1 } },
      { key: 'play.live.digit', params: { digit: cells[10].value } },
    ]);
    expect(announcementsFor([{ type: 'erase', cell: 80 }], cells)).toEqual([
      { key: 'play.live.erased', params: { row: 9, col: 9 } },
    ]);
  });

  it('announces a conflict instead of a plain placement', () => {
    expect(
      announcementsFor(
        [
          { type: 'place', cell: 2, digit: 5 },
          { type: 'conflict', cells: [2, 0] },
        ],
        cells,
      ),
    ).toEqual([{ key: 'play.live.conflict', params: { digit: 5, row: 1, col: 3 } }]);
  });
});
