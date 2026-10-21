import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideTranslocoTesting } from '../../../testing/i18n';
import { LANG_STORAGE_KEY, LanguageService } from './language.service';

describe('LanguageService', () => {
  function setup(): { service: LanguageService; transloco: TranslocoService } {
    TestBed.configureTestingModule({ providers: [provideTranslocoTesting()] });
    return {
      service: TestBed.inject(LanguageService),
      transloco: TestBed.inject(TranslocoService),
    };
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('prefers the persisted language', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'fr');
    const { service, transloco } = setup();
    expect(service.lang()).toBe('fr');
    expect(transloco.getActiveLang()).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('falls back to the first supported browser language', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE', 'pt-PT', 'en']);
    expect(setup().service.lang()).toBe('pt-BR');
  });

  it('uses navigator.language when languages is empty', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([]);
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-MX');
    expect(setup().service.lang()).toBe('es');
  });

  it('defaults to English for unsupported browsers', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de', 'ja']);
    expect(setup().service.lang()).toBe('en');
  });

  it('switches, persists and updates <html lang>', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en']);
    const { service, transloco } = setup();
    service.setLang('es');
    expect(service.lang()).toBe('es');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('es');
    expect(transloco.getActiveLang()).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('ignores switching to the current language', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en']);
    const { service } = setup();
    service.setLang('en');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();
  });
});
