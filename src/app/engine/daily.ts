import type { GeneratedPuzzle } from './generator';
import { generatePuzzle } from './generator';
import type { Tier } from './techniques/step';

/**
 * Version of the daily algorithm. Any change to the generator, the PRNG or the ladder
 * that alters daily puzzles must bump it (and the golden tests), so that players who
 * compare "today's puzzle" always see the same grid.
 */
export const DAILY_ALGO_VERSION = 1;

/**
 * Tier by UTC weekday (index 0 = Sunday): easy on Monday and Thursday, medium on Tuesday
 * and Friday, hard on Wednesday and the weekend, when players have more time.
 */
export const DAILY_TIER_BY_WEEKDAY: readonly Tier[] = [
  'hard',
  'easy',
  'medium',
  'hard',
  'easy',
  'medium',
  'hard',
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parses 'YYYY-MM-DD' as a UTC calendar date, rejecting malformed and impossible dates. */
function parseDate(date: string): Date {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !DATE_PATTERN.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`Invalid daily date "${date}", expected YYYY-MM-DD`);
  }
  return parsed;
}

export function dailyTier(date: string): Tier {
  return DAILY_TIER_BY_WEEKDAY[parseDate(date).getUTCDay()];
}

export function dailySeed(date: string): string {
  return `daily:v${DAILY_ALGO_VERSION}:${date}`;
}

/** The puzzle of the day: same date, same puzzle, on every device. */
export function dailyPuzzle(date: string): GeneratedPuzzle {
  return generatePuzzle(dailyTier(date), dailySeed(date));
}

/** Today's date in the player's local calendar as 'YYYY-MM-DD'. */
export function localDateString(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
