import { BOX_OF, COL_OF, ROW_OF } from '../../../engine';
import type { CellIndex } from '../../../engine';
import type { CellView } from '../../../core';
import type { BoardEvent } from './board-events';

/** A translatable screen reader message (keys live in the "play" scope). */
export interface Announcement {
  readonly key: string;
  readonly params?: Readonly<Record<string, number>>;
}

function unitAnnouncement(cells: readonly CellIndex[]): Announcement {
  const [first] = cells;
  if (cells.every((cell) => ROW_OF[cell] === ROW_OF[first])) {
    return { key: 'play.live.row', params: { n: ROW_OF[first] + 1 } };
  }
  if (cells.every((cell) => COL_OF[cell] === COL_OF[first])) {
    return { key: 'play.live.col', params: { n: COL_OF[first] + 1 } };
  }
  return { key: 'play.live.box', params: { n: BOX_OF[first] + 1 } };
}

/**
 * What a screen reader should hear after a move: the placement (or the conflict it caused),
 * completed units and digits. Notes are not announced, to keep the region quiet.
 */
export function announcementsFor(
  events: readonly BoardEvent[],
  cells: readonly CellView[],
): Announcement[] {
  const conflict = events.some((event) => event.type === 'conflict');
  const result: Announcement[] = [];
  for (const event of events) {
    switch (event.type) {
      case 'place': {
        const { row, col } = cells[event.cell];
        const key = conflict ? 'play.live.conflict' : 'play.live.placed';
        result.push({ key, params: { digit: event.digit, row: row + 1, col: col + 1 } });
        break;
      }
      case 'erase': {
        const { row, col } = cells[event.cell];
        result.push({ key: 'play.live.erased', params: { row: row + 1, col: col + 1 } });
        break;
      }
      case 'unit':
        result.push(unitAnnouncement(event.cells));
        break;
      case 'digit':
        result.push({ key: 'play.live.digit', params: { digit: cells[event.cells[0]].value } });
        break;
    }
  }
  return result;
}
