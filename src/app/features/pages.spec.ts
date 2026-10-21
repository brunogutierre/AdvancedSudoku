import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../testing/i18n';
import dailyEn from '../../../public/i18n/daily/en.json';
import settingsEn from '../../../public/i18n/settings/en.json';
import statsEn from '../../../public/i18n/stats/en.json';
import { Daily } from './daily/daily';
import { Settings } from './settings/settings';
import { Stats } from './stats/stats';

describe('placeholder pages', () => {
  it.each<[Type<unknown>, string]>([
    [Daily, 'Daily challenge'],
    [Stats, 'Statistics'],
    [Settings, 'Settings'],
  ])('%o renders its scoped title', async (page, title) => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoTesting({
          'daily/en': dailyEn,
          'stats/en': statsEn,
          'settings/en': settingsEn,
        }),
      ],
    });
    const fixture = TestBed.createComponent(page);
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe(title);
  });
});
