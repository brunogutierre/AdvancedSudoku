import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../../../testing/i18n';
import dailyEn from '../../../../public/i18n/daily/en.json';
import { APP_STORAGE, GameStore, STORAGE_KEYS, emptyStats } from '../../core';
import { MemoryStorage } from '../../core/testing/memory-storage';
import { KNOWN_PUZZLES } from '../../engine/testing/fixtures';
import { Daily } from './daily';
import { TODAY } from './week';

/** A Wednesday. */
const TODAY_DATE = '2026-10-21';

function setup(dailyWins: Record<string, number> = {}) {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEYS.stats, JSON.stringify({ ...emptyStats(), dailyWins }));
  storage.setItem(STORAGE_KEYS.settings, JSON.stringify({ lang: 'en' }));
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoTesting({ 'daily/en': dailyEn }),
      provideRouter([]),
      { provide: APP_STORAGE, useValue: storage },
      { provide: TODAY, useValue: TODAY_DATE },
    ],
  });
  const fixture = TestBed.createComponent(Daily);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const days = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.day'));
  const card = () => root.querySelector<HTMLElement>('.day-card')!;
  return { fixture, root, days, card };
}

describe('Daily', () => {
  it('shows the week, the streak and today as playable', () => {
    const { root, days, card } = setup({ '2026-10-19': 60_000, '2026-10-20': 95_000 });
    expect(root.querySelector('h1')?.textContent).toBe('October 2026');
    expect(root.querySelector('.streak')?.textContent?.trim()).toBe('2-day streak');
    expect(days().map((d) => d.dataset['state'])).toEqual([
      'done',
      'done',
      'today',
      'future',
      'future',
      'future',
      'future',
    ]);
    expect(days()[2].getAttribute('aria-current')).toBe('date');
    expect(days()[2].getAttribute('aria-label')).toBe('Wednesday, October 21, today');
    expect(days()[3].disabled).toBe(true);
    expect(card().querySelector('.chip')?.textContent).toBe('Hard');
    const play = card().querySelector<HTMLAnchorElement>('a.play')!;
    expect(play.textContent?.trim()).toBe('Play');
    expect(play.getAttribute('href')).toBe('/play?daily=2026-10-21');
    expect(card().textContent).toContain('Your best daily time: 1:00');
  });

  it('shows the time of a solved day and marks missed days', () => {
    const { fixture, days, card, root } = setup({ '2026-10-19': 60_000 });
    days()[0].click();
    fixture.detectChanges();
    expect(days()[0].getAttribute('aria-pressed')).toBe('true');
    expect(card().querySelector('.chip')?.textContent).toBe('Easy');
    expect(card().querySelector('.solved')?.textContent).toContain('Solved in 1:00');

    const [previous, next] = Array.from(root.querySelectorAll<HTMLButtonElement>('.week > button'));
    expect(next.disabled).toBe(true);
    previous.click();
    fixture.detectChanges();
    expect(days().map((d) => d.dataset['state'])).toEqual(Array(7).fill('missed'));
    expect(card().textContent).toContain('Missed.');
    next.click();
    fixture.detectChanges();
    expect(days()[2].getAttribute('aria-pressed')).toBe('true');
  });

  it("offers to continue today's unfinished daily and celebrates a solved one", () => {
    const wiki = KNOWN_PUZZLES[0];
    const first = setup();
    TestBed.inject(GameStore).newGame({
      puzzle: wiki.puzzle,
      solution: wiki.solution,
      difficulty: 'hard',
      mode: 'daily',
      dailyDate: TODAY_DATE,
    });
    first.fixture.detectChanges();
    expect(first.card().querySelector('a.play')?.textContent?.trim()).toBe('Continue');

    TestBed.resetTestingModule();
    const solved = setup({ [TODAY_DATE]: 3_723_000 });
    expect(solved.card().querySelector('a.play')).toBeNull();
    expect(solved.card().querySelector('.solved')?.textContent).toContain('Solved in 1:02:03');
    expect(solved.root.querySelector('.streak')?.classList).toContain('active');
  });
});
