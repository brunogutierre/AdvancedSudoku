import { parseGrid } from '../../engine';
import { KNOWN_PUZZLES } from '../../engine/testing/fixtures';
import type { GameState } from './game.model';
import { fromPersisted, isPersistedGame, toPersisted } from './persisted-game';

const wiki = KNOWN_PUZZLES[0];

function state(overrides: Partial<GameState> = {}): GameState {
  const notes = new Uint16Array(81);
  notes[2] = 0b1011;
  return {
    puzzle: parseGrid(wiki.puzzle),
    solution: parseGrid(wiki.solution),
    values: parseGrid(wiki.puzzle),
    notes,
    selected: 2,
    notesMode: true,
    difficulty: 'medium',
    mode: 'daily',
    dailyDate: '2026-10-21',
    seed: null,
    elapsedMs: 12_000,
    status: 'playing',
    mistakes: 1,
    hintsUsed: 2,
    assisted: true,
    ...overrides,
  };
}

describe('persisted game', () => {
  it('round-trips through JSON, resuming as paused', () => {
    const json = JSON.parse(JSON.stringify(toPersisted(state())));
    expect(isPersistedGame(json)).toBe(true);
    expect(fromPersisted(json)).toEqual(state({ status: 'paused' }));
    expect(fromPersisted(toPersisted(state({ status: 'won' }))).status).toBe('won');
  });

  it('rejects anything malformed', () => {
    const good = toPersisted(state());
    const bad: unknown[] = [
      null,
      'x',
      { ...good, puzzle: 'abc' },
      { ...good, solution: good.puzzle },
      { ...good, values: 1 },
      { ...good, notes: [1, 2] },
      { ...good, notes: good.notes.map(() => 1024) },
      { ...good, selected: 81 },
      { ...good, notesMode: 'yes' },
      { ...good, difficulty: 'expert' },
      { ...good, mode: 'zen' },
      { ...good, dailyDate: 5 },
      { ...good, seed: {} },
      { ...good, elapsedMs: -1 },
      { ...good, status: 'idle' },
      { ...good, mistakes: 1.5 },
      { ...good, hintsUsed: '2' },
      { ...good, assisted: null },
    ];
    for (const value of bad) expect(isPersistedGame(value), JSON.stringify(value)).toBe(false);
    expect(isPersistedGame({ ...good, selected: null, seed: 'abc' })).toBe(true);
  });
});
