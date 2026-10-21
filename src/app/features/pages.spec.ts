import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../testing/i18n';
import settingsEn from '../../../public/i18n/settings/en.json';
import { Settings } from './settings/settings';

describe('placeholder pages', () => {
  it.each<[Type<unknown>, string]>([[Settings, 'Settings']])(
    '%o renders its scoped title',
    async (page, title) => {
      TestBed.configureTestingModule({
        providers: [
          provideTranslocoTesting({
            'settings/en': settingsEn,
          }),
        ],
      });
      const fixture = TestBed.createComponent(page);
      fixture.detectChanges();
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe(title);
    },
  );
});
