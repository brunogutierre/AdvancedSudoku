import { emptyStats, isAssisted, withWin } from '../../../core';
import type { GameState } from '../../../core';
import { dailyStreakAfterWin, isNewBest } from './completion-info';

function game(overrides: Partial<GameState> = {}): GameState {
  return {
    puzzle: new Uint8Array(81),
    solution: new Uint8Array(81),
    values: new Uint8Array(81),
    notes: new Uint16Array(81),
    selected: null,
    notesMode: false,
    difficulty: 'hard',
    mode: 'classic',
    dailyDate: null,
    seed: null,
    elapsedMs: 300_000,
    status: 'won',
    mistakes: 0,
    hintsUsed: 0,
    assisted: false,
    ...overrides,
  };
}

describe('completion info', () => {
  const now = new Date('2026-10-21T12:00:00Z');

  it('flags a new best only when an unassisted win beats an existing best', () => {
    const fresh = emptyStats();
    expect(isNewBest(fresh, game())).toBe(false);

    const withBest = withWin(fresh, game({ elapsedMs: 400_000 }), now);
    expect(isNewBest(withBest, game())).toBe(true);
    expect(isNewBest(withBest, game({ elapsedMs: 500_000 }))).toBe(false);
    expect(isNewBest(withBest, game({ assisted: true }))).toBe(false);
    expect(isNewBest(withBest, game({ hintsUsed: 1 }))).toBe(false);
    expect(isNewBest(withBest, game({ difficulty: 'easy' }))).toBe(false);
  });

  it('reads the daily streak including the win just recorded', () => {
    const daily = (date: string) => game({ mode: 'daily', dailyDate: date });
    let stats = withWin(emptyStats(), daily('2026-10-20'), now);
    stats = withWin(stats, daily('2026-10-21'), now);
    expect(dailyStreakAfterWin(stats, daily('2026-10-21'))).toBe(2);
    expect(dailyStreakAfterWin(stats, game())).toBeNull();
  });

  it('never counts hinted or assisted wins for times', () => {
    expect(isAssisted(game())).toBe(false);
    expect(isAssisted(game({ hintsUsed: 2 }))).toBe(true);
    expect(isAssisted(game({ assisted: true }))).toBe(true);
    const stats = withWin(emptyStats(), game({ hintsUsed: 1, elapsedMs: 1000 }), now);
    expect(stats.perDifficulty.hard.bestMs).toBeNull();
    expect(stats.perDifficulty.hard.unassistedWins).toBe(0);
    expect(stats.perDifficulty.hard.won).toBe(1);
  });
});
