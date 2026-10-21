import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideTranslocoTesting } from '../../../testing/i18n';
import { APP_STORAGE, STORAGE_KEYS } from '../persistence/persistence.service';
import { SettingsStore } from '../settings/settings-store';
import { MemoryStorage } from '../testing/memory-storage';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let storage: MemoryStorage;

  function setup(): { service: LanguageService; transloco: TranslocoService } {
    TestBed.configureTestingModule({
      providers: [provideTranslocoTesting(), { provide: APP_STORAGE, useValue: storage }],
    });
    return {
      service: TestBed.inject(LanguageService),
      transloco: TestBed.inject(TranslocoService),
    };
  }

  beforeEach(() => (storage = new MemoryStorage()));
  afterEach(() => vi.restoreAllMocks());

  it('applies the persisted language', () => {
    storage.setItem(STORAGE_KEYS.settings, JSON.stringify({ lang: 'fr' }));
    const { service, transloco } = setup();
    expect(service.lang()).toBe('fr');
    expect(transloco.getActiveLang()).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('defaults to the browser language', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-MX');
    expect(setup().service.lang()).toBe('es');
  });

  it('switches through SettingsStore and updates <html lang>', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    const { service, transloco } = setup();
    service.setLang('es');
    expect(TestBed.inject(SettingsStore).lang()).toBe('es');
    expect(transloco.getActiveLang()).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('follows language changes made directly in SettingsStore', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    const { transloco } = setup();
    TestBed.inject(SettingsStore).set('lang', 'pt-BR');
    TestBed.tick();
    expect(transloco.getActiveLang()).toBe('pt-BR');
  });
});
