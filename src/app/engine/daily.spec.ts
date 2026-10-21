import { DAILY_ALGO_VERSION, dailyPuzzle, dailySeed, dailyTier, localDateString } from './daily';

describe('daily', () => {
  it('rotates tiers by weekday', () => {
    // 2026-10-19 is a Monday.
    const week = ['19', '20', '21', '22', '23', '24', '25'].map((d) => dailyTier(`2026-10-${d}`));
    expect(week).toEqual(['easy', 'medium', 'hard', 'easy', 'medium', 'hard', 'hard']);
  });

  it('builds a versioned seed', () => {
    expect(DAILY_ALGO_VERSION).toBe(1);
    expect(dailySeed('2026-10-21')).toBe('daily:v1:2026-10-21');
  });

  it('rejects malformed or impossible dates', () => {
    expect(() => dailyTier('2026-2-1')).toThrow(/Invalid daily date/);
    expect(() => dailyTier('2026-02-30')).toThrow(/Invalid daily date/);
    expect(() => dailyPuzzle('tomorrow')).toThrow(/Invalid daily date/);
  });

  it('formats the local date', () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // Golden values: if these change, every player's daily puzzle changes. Bump DAILY_ALGO_VERSION.
  const GOLDEN = [
    {
      date: '2026-10-19',
      tier: 'easy',
      puzzle: '7.....3.....3472..63.82..4.46.1.5.7.59.....34.2.4.8.95.1..53.68..9671.....6.....1',
      solution: '742516389985347216631829547463195872598762134127438695214953768859671423376284951',
    },
    {
      date: '2026-10-20',
      tier: 'medium',
      puzzle: '..5.6248...41...7...8.......3..2.65....6.8....69.1..3.......5...4...13...7624.8..',
      solution: '715962483324185976698374125837429651251638794469517238183796542942851367576243819',
    },
    {
      date: '2026-10-21',
      tier: 'hard',
      puzzle: '.467.....3....582.2.......6.1...69....39.84....25...1.6.......4.384....1.....728.',
      solution: '846723195391645827275189346417236958563918472982574613629851734738492561154367289',
    },
  ] as const;

  for (const golden of GOLDEN) {
    it(`pins the puzzle of ${golden.date}`, () => {
      expect(dailyPuzzle(golden.date)).toEqual({
        puzzle: golden.puzzle,
        solution: golden.solution,
        tier: golden.tier,
        seed: dailySeed(golden.date),
      });
    }, 20_000);
  }
});
