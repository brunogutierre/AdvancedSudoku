import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../../../testing/i18n';
import statsEn from '../../../../public/i18n/stats/en.json';
import { APP_STORAGE, STORAGE_KEYS, emptyStats, withStart, withWin } from '../../core';
import type { GameState, StatsData } from '../../core';
import { MemoryStorage } from '../../core/testing/memory-storage';
import { parseGrid } from '../../engine';
import { TODAY } from '../daily/week';
import { Stats } from './stats';

const NOW = new Date('2026-10-21T10:00:00Z');

function win(overrides: Partial<GameState>): GameState {
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

function setup(data: StatsData) {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEYS.stats, JSON.stringify(data));
  storage.setItem(STORAGE_KEYS.settings, JSON.stringify({ lang: 'en' }));
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoTesting({ 'stats/en': statsEn }),
      provideRouter([]),
      { provide: APP_STORAGE, useValue: storage },
      { provide: TODAY, useValue: '2026-10-21' },
    ],
  });
  const fixture = TestBed.createComponent(Stats);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const kpis = () =>
    Array.from(root.querySelectorAll('.kpi')).map((k) => [
      k.querySelector('dt')?.textContent?.trim(),
      k.querySelector('dd')?.textContent?.trim(),
    ]);
  const filter = (name: string) => {
    Array.from(root.querySelectorAll<HTMLButtonElement>('.filters button'))
      .find((b) => b.textContent?.trim() === name)!
      .click();
    fixture.detectChanges();
  };
  return { fixture, root, kpis, filter };
}

describe('Stats', () => {
  it('shows an empty state before the first game', () => {
    const { root, kpis } = setup(emptyStats());
    expect(root.querySelector('h1')?.textContent).toBe('Statistics');
    expect(kpis()).toEqual([
      ['Games played', '0'],
      ['Win rate', '–'],
      ['Best time', '–'],
      ['Average time', '–'],
    ]);
    expect(root.querySelector('.empty')?.textContent).toContain('No solved games yet.');
    expect(root.querySelector('.empty a')?.textContent?.trim()).toBe('Play a game');
    expect(root.querySelector('app-time-chart')).toBeNull();
  });

  it('summarizes all games or one difficulty, with streaks and a chart', () => {
    let data = emptyStats();
    for (const d of ['easy', 'easy', 'easy', 'hard'] as const) data = withStart(data, d);
    data = withWin(data, win({ elapsedMs: 120_000 }), NOW);
    data = withWin(data, win({ elapsedMs: 60_000, assisted: true }), NOW);
    data = withWin(
      data,
      win({ difficulty: 'hard', elapsedMs: 600_000, mode: 'daily', dailyDate: '2026-10-20' }),
      NOW,
    );
    const { root, kpis, filter } = setup(data);

    expect(kpis()).toEqual([
      ['Games played', '4'],
      ['Win rate', '75%'],
      ['Best time', '2:00'],
      ['Average time', '6:00'],
    ]);
    const streak = Array.from(root.querySelectorAll('.streak dd')).map((d) => d.textContent);
    expect(streak).toEqual(['1', '1']);

    expect(root.querySelectorAll('app-time-chart rect').length).toBe(3);

    filter('Hard');
    expect(root.querySelector('[aria-pressed=true]')?.textContent?.trim()).toBe('Hard');
    expect(kpis()[0]).toEqual(['Games played', '1']);
    expect(root.querySelectorAll('app-time-chart rect').length).toBe(1);

    filter('Insane');
    expect(root.querySelector('app-time-chart')).toBeNull();
    expect(root.querySelector('.empty')?.textContent).toContain('No solved games yet.');
  });
});
