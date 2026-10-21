import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { LocalStorage, STORAGE_PREFIX } from '../storage/local-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** Must match the inline script in index.html, which applies the theme before first paint. */
export const THEME_STORAGE_KEY = `${STORAGE_PREFIX}theme`;

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Light / dark / system theme. Colors live in CSS (`light-dark()` + `color-scheme`); this
 * service only toggles `data-theme` on `<html>` and persists the choice.
 *
 * `setMode` is the single entry point, so a future settings store can own persistence and
 * simply call it.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(LocalStorage);
  private readonly _mode = signal<ThemeMode>(this.readStored());

  readonly mode = this._mode.asReadonly();

  constructor() {
    this.apply(this._mode());
  }

  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
    this.apply(mode);
    if (mode === 'system') {
      this.storage.remove(THEME_STORAGE_KEY);
    } else {
      this.storage.set(THEME_STORAGE_KEY, mode);
    }
  }

  private readStored(): ThemeMode {
    const stored = this.storage.get(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  }

  private apply(mode: ThemeMode): void {
    const root = this.document.documentElement;
    if (mode === 'system') {
      delete root.dataset['theme'];
    } else {
      root.dataset['theme'] = mode;
    }
  }
}
