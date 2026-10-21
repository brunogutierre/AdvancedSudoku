import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../testing/i18n';
import statsEn from '../../../../public/i18n/stats/en.json';
import type { GameRecord } from '../../core';
import { TimeChart } from './time-chart';

const record = (difficulty: GameRecord['difficulty'], seconds: number, assisted = false) =>
  ({
    difficulty,
    mode: 'classic',
    dailyDate: null,
    elapsedMs: seconds * 1000,
    assisted,
    mistakes: 0,
    hintsUsed: assisted ? 1 : 0,
    finishedAt: '2026-10-21T10:00:00.000Z',
  }) satisfies GameRecord;

@Component({
  imports: [TimeChart],
  template: `<app-time-chart [records]="records()" />`,
})
class Host {
  readonly records = signal<readonly GameRecord[]>([
    record('easy', 120),
    record('easy', 60, true),
    record('hard', 600),
  ]);
}

describe('TimeChart', () => {
  it('draws bars by difficulty, labels the best unassisted time and mirrors data in a table', () => {
    TestBed.configureTestingModule({
      providers: [provideTranslocoTesting({ 'stats/en': statsEn })],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    const bars = Array.from(root.querySelectorAll<HTMLElement>('.bar'));
    expect(bars.map((b) => b.getAttribute('data-difficulty'))).toEqual(['easy', 'easy', 'hard']);
    expect(bars[1].classList).toContain('assisted');
    expect(bars.map((b) => b.style.height)).toEqual(['20%', '10%', '100%']);
    expect(root.querySelector('.best')?.textContent?.trim()).toBe('2:00');
    expect(Array.from(root.querySelectorAll('.axis')).map((t) => t.textContent?.trim())).toEqual([
      '3:20',
      '6:40',
      '10:00',
    ]);
    expect(root.querySelector('[role=img]')?.getAttribute('aria-label')).toBe(
      'Solve times of the last 3 games won, oldest first',
    );
    const rows = Array.from(root.querySelectorAll('tbody tr')).map((r) =>
      Array.from(r.querySelectorAll('td')).map((td) => td.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['1', 'Easy', '2:00'],
      ['2', 'Easy', '1:00 (assisted)'],
      ['3', 'Hard', '10:00'],
    ]);

    fixture.componentInstance.records.set([record('medium', 30, true)]);
    fixture.detectChanges();
    expect(root.querySelector('.best')).toBeNull();
  });
});
