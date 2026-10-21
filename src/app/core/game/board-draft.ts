import { computeCandidates, PEERS } from '../../engine';
import type { CandidateGrid, CellIndex, Digit, Grid, Step } from '../../engine';
import type { CellChange } from './game.model';

/**
 * Working copy of the board used to build one command. Every mutation is recorded, so
 * `changes()` returns exactly the cells touched with their original and final contents,
 * however many times each was modified.
 */
export class BoardDraft {
  readonly values: Grid;
  readonly notes: CandidateGrid;
  private readonly originals = new Map<CellIndex, { value: number; notes: number }>();

  constructor(values: Grid, notes: CandidateGrid) {
    this.values = new Uint8Array(values);
    this.notes = new Uint16Array(notes);
  }

  private touch(cell: CellIndex): void {
    if (!this.originals.has(cell))
      this.originals.set(cell, { value: this.values[cell], notes: this.notes[cell] });
  }

  setValue(cell: CellIndex, value: number): void {
    this.touch(cell);
    this.values[cell] = value;
  }

  setNotes(cell: CellIndex, notes: number): void {
    this.touch(cell);
    this.notes[cell] = notes;
  }

  /** Places a digit, clears the cell's notes and removes the digit from its peers' notes. */
  place(cell: CellIndex, digit: Digit): void {
    const bit = 1 << (digit - 1);
    this.setValue(cell, digit);
    this.setNotes(cell, 0);
    for (const peer of PEERS[cell]) {
      if (this.notes[peer] & bit) this.setNotes(peer, this.notes[peer] & ~bit);
    }
  }

  toggleNote(cell: CellIndex, digit: Digit): void {
    this.setNotes(cell, this.notes[cell] ^ (1 << (digit - 1)));
  }

  /** Clears the value, or the notes when the cell has no value. */
  erase(cell: CellIndex): void {
    if (this.values[cell] !== 0) this.setValue(cell, 0);
    else this.setNotes(cell, 0);
  }

  /** Sets every empty cell's notes to the candidates allowed by the placed digits. */
  fillCandidates(): void {
    const candidates = computeCandidates(this.values);
    for (let cell = 0; cell < 81; cell++) {
      if (this.values[cell] === 0 && this.notes[cell] !== candidates[cell])
        this.setNotes(cell, candidates[cell]);
    }
  }

  /**
   * Applies a hint. Eliminations need pencil marks to act on: if a target cell has none,
   * the board is first filled with candidates (in the same command).
   */
  applyStep(step: Step): void {
    if (step.eliminations.some((e) => this.values[e.cell] === 0 && this.notes[e.cell] === 0))
      this.fillCandidates();
    for (const { cell, digit } of step.placements) this.place(cell, digit);
    for (const { cell, digit } of step.eliminations) {
      const bit = 1 << (digit - 1);
      if (this.notes[cell] & bit) this.setNotes(cell, this.notes[cell] & ~bit);
    }
  }

  /** Touched cells whose content actually changed. */
  changes(): CellChange[] {
    const result: CellChange[] = [];
    for (const [cell, before] of this.originals) {
      const after = { value: this.values[cell], notes: this.notes[cell] };
      if (after.value !== before.value || after.notes !== before.notes)
        result.push({ cell, before, after });
    }
    return result.sort((a, b) => a.cell - b.cell);
  }
}

/** Replays (`'after'`) or reverts (`'before'`) a list of changes onto copies of the arrays. */
export function applyChanges(
  values: Grid,
  notes: CandidateGrid,
  changes: readonly CellChange[],
  side: 'before' | 'after',
): { values: Grid; notes: CandidateGrid } {
  const nextValues = new Uint8Array(values);
  const nextNotes = new Uint16Array(notes);
  for (const change of changes) {
    nextValues[change.cell] = change[side].value;
    nextNotes[change.cell] = change[side].notes;
  }
  return { values: nextValues, notes: nextNotes };
}
