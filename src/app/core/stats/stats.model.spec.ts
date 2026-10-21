import { parseGrid } from '../../engine';
import type { GameState } from '../game/game.model';
import {
  MAX_RECENT,
  addDays,
  dailyStreaks,
  emptyStats,
  isStatsData,
  summarize,
  withStart,
  withWin,
} from './stats.model';

const NOW = new Date('2026-10-21T12:00:00Z');

function game(overrides: Partial<GameState> = {}): GameState {
  const grid = parseGrid('.'.repeat(81));
  return {
    puzzle: grid,
    solution: grid,
    values: grid,
    notes: new Uint16Array(81),
    selected: null,
    notesMode: false,
    difficulty: 'easy',
    mode: 'classic',
    dailyDate: null,
    seed: null,
    elapsedMs: 60_000,
    status: 'won',
    mistakes: 0,
    hintsUsed: 0,
    assisted: false,
    ...overrides,
  };
}

describe('stats model', () => {
  it('counts starts and wins, with times from unassisted wins only', () => {
    let data = withStart(withStart(withStart(emptyStats(), 'easy'), 'easy'), 'hard');
    data = withWin(data, game({ elapsedMs: 90_000 }), NOW);
    data = withWin(data, game({ elapsedMs: 30_000, assisted: true, hintsUsed: 2 }), NOW);
    data = withWin(data, game({ difficulty: 'hard', elapsedMs: 300_000 }), NOW);

    expect(data.perDifficulty.easy).toEqual({
      started: 2,
      won: 2,
      unassistedWins: 1,
      unassistedTimeMs: 90_000,
      bestMs: 90_000,
    });
    expect(summarize(data, 'easy')).toEqual({
      played: 2,
      won: 2,
      winRate: 1,
      bestMs: 90_000,
      averageMs: 90_000,
    });
    expect(summarize(data, 'all')).toEqual({
      played: 3,
      won: 3,
      winRate: 1,
      bestMs: 90_000,
      averageMs: 195_000,
    });
    expect(summarize(data, 'insane')).toEqual({
      played: 0,
      won: 0,
      winRate: null,
      bestMs: null,
      averageMs: null,
    });
    expect(data.recent.map((r) => r.hintsUsed)).toEqual([0, 2, 0]);
    expect(data.recent[0].finishedAt).toBe(NOW.toISOString());
  });

  it('counts abandoned games against the win rate', () => {
    let data = withStart(withStart(emptyStats(), 'medium'), 'medium');
    data = withWin(data, game({ difficulty: 'medium' }), NOW);
    expect(summarize(data, 'medium').winRate).toBe(0.5);
    // A win of a game started before stats existed never makes the rate exceed 100%.
    expect(summarize(withWin(emptyStats(), game(), NOW), 'easy').winRate).toBe(1);
  });

  it('keeps the best daily time per date and caps the history', () => {
    let data = emptyStats();
    const daily = { mode: 'daily' as const, dailyDate: '2026-10-21' };
    data = withWin(data, game({ ...daily, elapsedMs: 50_000 }), NOW);
    data = withWin(data, game({ ...daily, elapsedMs: 70_000 }), NOW);
    expect(data.dailyWins).toEqual({ '2026-10-21': 50_000 });

    for (let i = 0; i < MAX_RECENT + 5; i++) data = withWin(data, game({ elapsedMs: i }), NOW);
    expect(data.recent).toHaveLength(MAX_RECENT);
    expect(data.recent.at(-1)?.elapsedMs).toBe(MAX_RECENT + 4);
    expect(data.perDifficulty.easy.won).toBe(MAX_RECENT + 7);
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('computes current and longest daily streaks', () => {
    const wins = (dates: string[]) => Object.fromEntries(dates.map((d) => [d, 1000]));
    const run = wins(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-19', '2026-10-20']);
    // Today not solved yet: the streak ending yesterday still counts.
    expect(dailyStreaks(run, '2026-10-21')).toEqual({ current: 2, longest: 3 });
    expect(dailyStreaks({ ...run, '2026-10-21': 1 }, '2026-10-21')).toEqual({
      current: 3,
      longest: 3,
    });
    expect(dailyStreaks(run, '2026-10-22')).toEqual({ current: 0, longest: 3 });
    expect(dailyStreaks({}, '2026-10-22')).toEqual({ current: 0, longest: 0 });
  });

  it('validates stored data', () => {
    const good = withWin(
      withStart(emptyStats(), 'easy'),
      game({ mode: 'daily', dailyDate: '2026-10-21' }),
      NOW,
    );
    expect(isStatsData(JSON.parse(JSON.stringify(good)))).toBe(true);
    const bad: unknown[] = [
      null,
      [],
      { ...good, perDifficulty: { ...good.perDifficulty, hard: { started: -1 } } },
      { ...good, recent: 'x' },
      { ...good, recent: [{ ...good.recent[0], difficulty: 'expert' }] },
      { ...good, recent: [{ ...good.recent[0], dailyDate: 'today' }] },
      { ...good, dailyWins: { yesterday: 5 } },
      { ...good, dailyWins: [] },
    ];
    for (const value of bad) expect(isStatsData(value)).toBe(false);
  });
});
