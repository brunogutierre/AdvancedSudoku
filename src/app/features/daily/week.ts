import { InjectionToken } from '@angular/core';
import { addDays } from '../../core';
import { localDateString } from '../../engine';

/** Today's date in the player's calendar ('YYYY-MM-DD'); a token so tests can pin it. */
export const TODAY = new InjectionToken<string>('TODAY', {
  providedIn: 'root',
  factory: () => localDateString(),
});

export type DayState = 'done' | 'missed' | 'today' | 'future';

export interface WeekDay {
  readonly date: string;
  readonly state: DayState;
}

/** The Monday-to-Sunday week containing `date`. */
export function weekOf(date: string): string[] {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const monday = addDays(date, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Solved days are "done" even if it is today; past unsolved days are "missed". */
export function dayState(date: string, today: string, solved: boolean): DayState {
  if (solved) {
    return 'done';
  }
  if (date === today) {
    return 'today';
  }
  return date < today ? 'missed' : 'future';
}

/** Formats a calendar date in the given language without time-zone shifts. */
export function formatDate(
  date: string,
  lang: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(lang, { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
