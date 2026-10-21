import { TestBed } from '@angular/core/testing';
import { computeCandidates, maskOf } from '../../engine';
import type { Step } from '../../engine';
import { KNOWN_PUZZLES } from '../../engine/testing/fixtures';
import { APP_STORAGE, STORAGE_KEYS } from '../persistence/persistence.service';
import { SettingsStore } from '../settings/settings-store';
import { MemoryStorage } from '../testing/memory-storage';
import { GameStore } from './game-store';
import type { NewGameInput } from './game.model';

const wiki = KNOWN_PUZZLES[0];
/** R1C3 is empty in the puzzle and its solution is 4. */
const R1C3 = 2;

const medium: NewGameInput = {
  puzzle: wiki.puzzle,
  solution: wiki.solution,
  difficulty: 'medium',
  seed: 's1',
};
/** The solution with only R1C3 and R9C9 left empty. */
const almostDone: NewGameInput = {
  puzzle: wiki.solution.slice(0, 2) + '.' + wiki.solution.slice(3, 80) + '.',
  solution: wiki.solution,
  difficulty: 'hard',
};

function setup(storage = new MemoryStorage()) {
  TestBed.configureTestingModule({ providers: [{ provide: APP_STORAGE, useValue: storage }] });
  return { store: TestBed.inject(GameStore), settings: TestBed.inject(SettingsStore), storage };
}

function step(partial: Partial<Step>): Step {
  return {
    technique: 'nakedSingle',
    placements: [],
    eliminations: [],
    highlights: { cells: [], units: [], digits: [] },
    explainKey: 'technique.nakedSingle.explain',
    params: {},
    ...partial,
  };
}

describe('GameStore', () => {
  afterEach(() => vi.useRealTimers());

  it('starts idle and ignores board actions', () => {
    const { store } = setup();
    expect(store.status()).toBe('idle');
    expect(store.cells()).toHaveLength(81);
    expect(store.progress()).toBe(0);
    store.select(R1C3);
    store.input(4);
    store.autoCandidates();
    store.applyStep(step({ placements: [{ cell: R1C3, digit: 4 }] }));
    expect(store.state().values[R1C3]).toBe(0);
    expect(store.status()).toBe('idle');
  });

  it('starts a game, filling notes automatically only for easy puzzles', () => {
    const { store, settings } = setup();
    store.newGame(medium);
    expect(store.state()).toMatchObject({
      status: 'playing',
      difficulty: 'medium',
      mode: 'classic',
      seed: 's1',
    });
    expect(store.state().notes.every((n) => n === 0)).toBe(true);

    store.newGame({ ...medium, difficulty: 'easy', mode: 'daily', dailyDate: '2026-10-21' });
    expect(store.state()).toMatchObject({ mode: 'daily', dailyDate: '2026-10-21' });
    expect(Array.from(store.state().notes)).toEqual(
      Array.from(computeCandidates(store.state().puzzle)),
    );

    settings.set('autoCandidatesEasy', false);
    store.newGame({ ...medium, difficulty: 'easy' });
    expect(store.state().notes.every((n) => n === 0)).toBe(true);
  });

  it('moves the selection with wrap-around', () => {
    const { store } = setup();
    store.moveSelection('left');
    expect(store.selected()).toBe(0);
    store.moveSelection('left');
    expect(store.selected()).toBe(8);
    store.moveSelection('up');
    expect(store.selected()).toBe(80);
    store.moveSelection('down');
    store.moveSelection('right');
    expect(store.selected()).toBe(0);
  });

  it('places digits, clearing peer notes in the same undoable command', () => {
    const { store } = setup();
    store.newGame(medium);
    store.select(3); // R1C4, peer of R1C3
    store.input(4, { note: true });
    store.input(6, { note: true });
    store.select(R1C3);
    store.input(4);
    expect(store.state().values[R1C3]).toBe(4);
    expect(store.cells()[3].notes).toBe(maskOf([6]));

    store.undo();
    expect(store.state().values[R1C3]).toBe(0);
    expect(store.cells()[3].notes).toBe(maskOf([4, 6]));
    expect(store.canRedo()).toBe(true);
    store.redo();
    expect(store.state().values[R1C3]).toBe(4);
    store.undo();
    store.input(1); // a new action clears the redo stack
    expect(store.canRedo()).toBe(false);
    expect(store.canUndo()).toBe(true);
  });

  it('ignores givens, repeated digits and notes on filled cells', () => {
    const { store } = setup();
    store.newGame(medium);
    store.select(0); // given 5
    store.input(1);
    store.erase();
    expect(store.state().values[0]).toBe(5);
    store.select(R1C3);
    store.input(4);
    store.input(4);
    store.input(7, { note: true });
    expect(store.cells()[R1C3].notes).toBe(0);
    store.undo();
    expect(store.canUndo()).toBe(false);
  });

  it('toggles notes mode and erases values then notes', () => {
    const { store } = setup();
    store.newGame(medium);
    store.select(R1C3);
    store.toggleNotesMode();
    expect(store.notesMode()).toBe(true);
    store.input(1);
    store.input(2);
    expect(store.cells()[R1C3].notes).toBe(maskOf([1, 2]));
    store.erase();
    expect(store.cells()[R1C3].notes).toBe(0);
    store.toggleNotesMode();
    store.input(4);
    store.erase();
    expect(store.state().values[R1C3]).toBe(0);
    store.undo();
    expect(store.state().values[R1C3]).toBe(4);
  });

  it('flags cells according to the mistake mode and counts mistakes in solution mode', () => {
    const { store, settings } = setup();
    store.newGame(medium);
    store.select(R1C3);
    store.input(5); // conflicts with the given 5 in R1C1, and is wrong
    expect(store.cells()[R1C3].conflict).toBe(true);
    expect(store.cells()[0].conflict).toBe(true);
    expect(store.mistakes()).toBe(0);

    settings.set('mistakeMode', 'solution');
    expect(store.cells()[0].conflict).toBe(false);
    expect(store.cells()[R1C3].conflict).toBe(true);
    store.input(2); // wrong, but no rule conflict
    expect(store.cells()[R1C3].conflict).toBe(true);
    expect(store.mistakes()).toBe(1);

    settings.set('mistakeMode', 'off');
    expect(store.cells().some((c) => c.conflict)).toBe(false);
  });

  it('fills candidates as one assisted command', () => {
    const { store } = setup();
    store.newGame(medium);
    store.autoCandidates();
    expect(store.state().assisted).toBe(true);
    expect(store.cells()[R1C3].notes).toBe(maskOf([1, 2, 4]));
    store.undo();
    expect(store.cells()[R1C3].notes).toBe(0);
  });

  it('applies hints, counting them', () => {
    const { store } = setup();
    store.newGame(medium);
    store.applyStep(step({ placements: [{ cell: R1C3, digit: 4 }] }));
    expect(store.state()).toMatchObject({ hintsUsed: 1, assisted: true, selected: R1C3 });
    expect(store.state().values[R1C3]).toBe(4);

    store.applyStep(step({ technique: 'pointing', eliminations: [{ cell: 3, digit: 2 }] }));
    expect(store.cells()[3].notes & maskOf([2])).toBe(0);
    expect(store.cells()[5].notes).not.toBe(0); // notes were filled first

    store.applyStep(
      step({ technique: 'mistake', highlights: { cells: [40], units: [], digits: [] } }),
    );
    expect(store.state()).toMatchObject({ hintsUsed: 3, selected: 40 });
  });

  it('detects the win, stops the clock and freezes the board', () => {
    vi.useFakeTimers();
    const { store } = setup();
    store.newGame(almostDone);
    store.select(R1C3);
    store.input(4);
    store.select(80);
    store.input(9);
    expect(store.status()).toBe('won');
    expect(store.isWon()).toBe(true);
    const elapsed = store.elapsedMs();
    vi.advanceTimersByTime(5000);
    expect(store.elapsedMs()).toBe(elapsed);
    store.erase();
    store.undo();
    expect(store.state().values[80]).toBe(9);
  });

  it('wins through redo too', () => {
    const { store } = setup();
    store.newGame({ ...almostDone, puzzle: wiki.solution.slice(0, 80) + '.' });
    store.select(80);
    store.input(1);
    store.input(9);
    expect(store.status()).toBe('won');
  });

  it('runs the clock only while playing and pauses when the page is hidden', () => {
    vi.useFakeTimers();
    const { store } = setup();
    store.newGame(medium);
    vi.advanceTimersByTime(3000);
    expect(store.elapsedMs()).toBe(3000);
    store.pause();
    vi.advanceTimersByTime(5000);
    expect(store.elapsedMs()).toBe(3000);
    store.select(R1C3);
    store.input(4);
    expect(store.state().values[R1C3]).toBe(0);
    store.resume();
    vi.advanceTimersByTime(1500);
    expect(store.elapsedMs()).toBe(4000);

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(store.status()).toBe('paused');
    expect(store.elapsedMs()).toBe(4500);
    visibility.mockRestore();
  });

  it('persists the game and restores it paused', () => {
    vi.useFakeTimers();
    const { store, storage } = setup();
    store.newGame(medium);
    store.select(R1C3);
    store.input(4);
    vi.advanceTimersByTime(2000);
    TestBed.tick();
    vi.advanceTimersByTime(1000);
    expect(storage.getItem(STORAGE_KEYS.game)).not.toBeNull();

    TestBed.resetTestingModule();
    const restored = setup(storage).store;
    expect(restored.status()).toBe('paused');
    expect(restored.state().values[R1C3]).toBe(4);
    expect(restored.elapsedMs()).toBeGreaterThanOrEqual(2000);
  });

  it('starts idle when the saved game is corrupt', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.game, JSON.stringify({ puzzle: 'nope' }));
    expect(setup(storage).store.status()).toBe('idle');
  });
});
