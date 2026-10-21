import { TestBed } from '@angular/core/testing';
import { APP_STORAGE, STORAGE_KEYS } from '../persistence/persistence.service';
import { MemoryStorage } from '../testing/memory-storage';
import { SettingsStore } from './settings-store';
import { DEFAULT_SETTINGS, detectLang, sanitizeSettings } from './settings.model';

function setup(storage = new MemoryStorage()): { store: SettingsStore; storage: MemoryStorage } {
  TestBed.configureTestingModule({ providers: [{ provide: APP_STORAGE, useValue: storage }] });
  return { store: TestBed.inject(SettingsStore), storage };
}

describe('settings model', () => {
  it('keeps valid fields and defaults the rest', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ theme: 'dark', sound: 'yes', lang: 'de', extra: 1 })).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
    });
  });

  it('detects supported languages', () => {
    expect(detectLang('pt-PT')).toBe('pt-BR');
    expect(detectLang('es-MX')).toBe('es');
    expect(detectLang('fr-CA')).toBe('fr');
    expect(detectLang('de')).toBe('en');
    expect(detectLang(undefined)).toBe('en');
  });
});

describe('SettingsStore', () => {
  afterEach(() => vi.useRealTimers());

  it('starts from defaults', () => {
    const { store } = setup();
    expect(store.settings()).toEqual({ ...DEFAULT_SETTINGS, lang: detectLang(navigator.language) });
    expect(store.autoCandidatesEasy()).toBe(true);
  });

  it('updates fields, ignores invalid values and exposes selectors', () => {
    const { store } = setup();
    store.update({ theme: 'dark', mistakeMode: 'solution' });
    store.set('lang', 'fr');
    store.update({ reducedMotion: 'sometimes' as never });
    expect(store.theme()).toBe('dark');
    expect(store.mistakeMode()).toBe('solution');
    expect(store.lang()).toBe('fr');
    expect(store.reducedMotion()).toBe('system');
    store.set('sound', true);
    store.set('haptics', false);
    store.set('highlightPeers', false);
    store.set('highlightSameDigit', false);
    expect([
      store.sound(),
      store.haptics(),
      store.highlightPeers(),
      store.highlightSameDigit(),
    ]).toEqual([true, false, false, false]);
    store.reset();
    expect(store.theme()).toBe('system');
  });

  it('persists changes (debounced) and restores them', () => {
    vi.useFakeTimers();
    const { store, storage } = setup();
    store.set('theme', 'light');
    TestBed.tick();
    vi.runAllTimers();
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.settings)!).theme).toBe('light');

    TestBed.resetTestingModule();
    expect(setup(storage).store.theme()).toBe('light');
  });

  it('falls back to defaults on corrupt data', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.settings, '"garbage"');
    expect(setup(storage).store.theme()).toBe('system');
  });
});
