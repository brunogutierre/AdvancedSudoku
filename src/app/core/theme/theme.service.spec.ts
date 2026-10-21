import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService, isThemeMode } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    delete root.dataset['theme'];
  });

  it('defaults to system without data-theme', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('system');
    expect(root.dataset['theme']).toBeUndefined();
  });

  it('restores a persisted mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(TestBed.inject(ThemeService).mode()).toBe('dark');
    expect(root.dataset['theme']).toBe('dark');
  });

  it('ignores invalid persisted values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(TestBed.inject(ThemeService).mode()).toBe('system');
  });

  it('applies and persists explicit modes, and forgets system', () => {
    const service = TestBed.inject(ThemeService);
    service.setMode('light');
    expect(root.dataset['theme']).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    service.setMode('system');
    expect(service.mode()).toBe('system');
    expect(root.dataset['theme']).toBeUndefined();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('validates modes', () => {
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('blue')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });
});
