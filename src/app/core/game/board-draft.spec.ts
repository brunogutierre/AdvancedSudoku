import { computeCandidates, maskOf, parseGrid } from '../../engine';
import type { Step } from '../../engine';
import { KNOWN_PUZZLES } from '../../engine/testing/fixtures';
import { applyChanges, BoardDraft } from './board-draft';

const puzzle = parseGrid(KNOWN_PUZZLES[0].puzzle);
const emptyNotes = () => new Uint16Array(81);

function step(partial: Partial<Step>): Step {
  return {
    technique: 'nakedSingle',
    placements: [],
    eliminations: [],
    highlights: { cells: [], units: [], digits: [] },
    explainKey: '',
    params: {},
    ...partial,
  };
}

describe('BoardDraft', () => {
  it('places a digit and removes it from peer notes in the same change set', () => {
    const notes = emptyNotes();
    notes[2] = maskOf([1, 4]); // the target cell itself
    notes[3] = maskOf([4, 6]); // peer in row 1
    notes[80] = maskOf([4]); // not a peer
    const draft = new BoardDraft(puzzle, notes);
    draft.place(2, 4);
    expect(draft.changes()).toEqual([
      { cell: 2, before: { value: 0, notes: maskOf([1, 4]) }, after: { value: 4, notes: 0 } },
      {
        cell: 3,
        before: { value: 0, notes: maskOf([4, 6]) },
        after: { value: 0, notes: maskOf([6]) },
      },
    ]);
    // The source arrays are untouched.
    expect(puzzle[2]).toBe(0);
    expect(notes[3]).toBe(maskOf([4, 6]));
  });

  it('toggles notes and erases values, then notes', () => {
    const draft = new BoardDraft(puzzle, emptyNotes());
    draft.toggleNote(2, 1);
    draft.toggleNote(2, 2);
    draft.toggleNote(2, 1);
    expect(draft.notes[2]).toBe(maskOf([2]));
    draft.erase(2);
    expect(draft.notes[2]).toBe(0);
    draft.setValue(2, 9);
    draft.erase(2);
    expect(draft.values[2]).toBe(0);
    // Net effect: nothing changed, so no diff is reported.
    expect(draft.changes()).toEqual([]);
  });

  it('fills candidates for empty cells only', () => {
    const draft = new BoardDraft(puzzle, emptyNotes());
    draft.fillCandidates();
    const expected = computeCandidates(puzzle);
    expect(Array.from(draft.notes)).toEqual(Array.from(expected));
    expect(draft.changes()).toHaveLength(81 - 30);
  });

  it('applies hint placements and eliminations, filling notes first when needed', () => {
    const draft = new BoardDraft(puzzle, emptyNotes());
    draft.applyStep(step({ eliminations: [{ cell: 2, digit: 1 }] }));
    expect(draft.notes[2]).toBe(maskOf([2, 4]));
    expect(draft.notes[3]).toBe(computeCandidates(puzzle)[3]);

    const withNotes = emptyNotes();
    withNotes[2] = maskOf([2, 4]);
    const second = new BoardDraft(puzzle, withNotes);
    second.applyStep(
      step({ placements: [{ cell: 2, digit: 4 }], eliminations: [{ cell: 2, digit: 7 }] }),
    );
    expect(second.values[2]).toBe(4);
    expect(second.notes[3]).toBe(0); // no notes were filled: the elimination target had notes
  });

  it('replays and reverts changes on copies', () => {
    const draft = new BoardDraft(puzzle, emptyNotes());
    draft.place(2, 4);
    const changes = draft.changes();
    const after = applyChanges(puzzle, emptyNotes(), changes, 'after');
    expect(after.values[2]).toBe(4);
    const before = applyChanges(after.values, after.notes, changes, 'before');
    expect(before.values).toEqual(puzzle);
    expect(after.values).not.toBe(puzzle);
  });
});
