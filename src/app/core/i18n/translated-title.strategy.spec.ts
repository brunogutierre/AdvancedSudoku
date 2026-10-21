import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { provideTranslocoTesting } from '../../../testing/i18n';
import { TranslatedTitleStrategy } from './translated-title.strategy';

@Component({ template: '' })
class Blank {}

describe('TranslatedTitleStrategy', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoTesting(),
        provideRouter([
          { path: '', component: Blank },
          { path: 'stats', component: Blank, title: 'nav.stats' },
        ]),
        { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
      ],
    });
  });

  it('uses the app name alone, or "Page · App", and follows the language', async () => {
    const router = TestBed.inject(Router);
    const title = TestBed.inject(Title);

    await router.navigateByUrl('/');
    expect(title.getTitle()).toBe('Advanced Sudoku');

    await router.navigateByUrl('/stats');
    expect(title.getTitle()).toBe('Stats · Advanced Sudoku');

    TestBed.inject(TranslocoService).setActiveLang('es');
    expect(title.getTitle()).toBe('Estadísticas · Advanced Sudoku');
  });
});
