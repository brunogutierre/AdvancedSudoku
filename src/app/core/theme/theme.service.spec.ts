import { TestBed } from '@angular/core/testing';
import { APP_STORAGE, STORAGE_KEYS } from '../persistence/persistence.service';
import { SettingsStore } from '../settings/settings-store';
import { MemoryStorage } from '../testing/memory-storage';
import { ThemeService, isThemeMode } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    delete root.dataset['theme'];
    delete root.dataset['motion'];
    TestBed.configureTestingModule({ providers: [{ provide: APP_STORAGE, useValue: storage }] });
  });

  it('defaults to system without data-theme', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('system');
    expect(root.dataset['theme']).toBeUndefined();
  });

  it('applies the persisted settings', () => {
    storage.setItem(STORAGE_KEYS.settings, JSON.stringify({ theme: 'dark', reducedMotion: 'on' }));
    expect(TestBed.inject(ThemeService).mode()).toBe('dark');
    expect(root.dataset['theme']).toBe('dark');
    expect(root.dataset['motion']).toBe('reduced');
  });

  it('writes the theme to SettingsStore and applies it synchronously', () => {
    const service = TestBed.inject(ThemeService);
    service.setMode('light');
    expect(root.dataset['theme']).toBe('light');
    expect(TestBed.inject(SettingsStore).theme()).toBe('light');

    service.setMode('system');
    expect(root.dataset['theme']).toBeUndefined();
  });

  it('follows settings changed elsewhere, including the motion override', () => {
    TestBed.inject(ThemeService);
    const settings = TestBed.inject(SettingsStore);
    settings.update({ theme: 'dark', reducedMotion: 'off' });
    TestBed.tick();
    expect(root.dataset['theme']).toBe('dark');
    expect(root.dataset['motion']).toBe('full');

    settings.update({ theme: 'system', reducedMotion: 'system' });
    TestBed.tick();
    expect(root.dataset['theme']).toBeUndefined();
    expect(root.dataset['motion']).toBeUndefined();
  });

  it('validates modes', () => {
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('blue')).toBe(false);
  });
});
