import { DOCUMENT, Injectable, effect, inject } from '@angular/core';
import type { ReducedMotion } from '../settings/settings.model';
import { SettingsStore } from '../settings/settings-store';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

const MOTION_ATTR: Record<ReducedMotion, string | null> = {
  system: null,
  on: 'reduced',
  off: 'full',
};

/**
 * Applies the appearance settings to `<html>`: `data-theme` (absent = follow the system) and
 * `data-motion` (reduced-motion override). Colors live in CSS (`light-dark()`).
 *
 * SettingsStore owns the values and their persistence; the inline script in index.html reads
 * the same stored settings before first paint.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly settings = inject(SettingsStore);

  readonly mode = this.settings.theme;

  constructor() {
    // Applied now (first paint) and again whenever settings change from anywhere.
    effect(() => this.apply(this.mode()));
    effect(() => this.applyMotion(this.settings.reducedMotion()));
    this.apply(this.mode());
    this.applyMotion(this.settings.reducedMotion());
  }

  /** Changes the theme and updates the DOM synchronously (needed inside a View Transition). */
  setMode(mode: ThemeMode): void {
    this.settings.set('theme', mode);
    this.apply(mode);
  }

  private apply(mode: ThemeMode): void {
    const root = this.document.documentElement;
    if (mode === 'system') {
      delete root.dataset['theme'];
    } else {
      root.dataset['theme'] = mode;
    }
  }

  private applyMotion(motion: ReducedMotion): void {
    const root = this.document.documentElement;
    const value = MOTION_ATTR[motion];
    if (value === null) {
      delete root.dataset['motion'];
    } else {
      root.dataset['motion'] = value;
    }
  }
}
