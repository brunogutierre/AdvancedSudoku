import { DOCUMENT, Injectable, inject } from '@angular/core';
import { SettingsStore } from '../settings/settings-store';

export type HapticName = 'tap' | 'radial' | 'error' | 'unit' | 'hint' | 'win' | 'combo';

/** Vibration patterns in ms (vibrate, pause, vibrate...). */
export const HAPTIC_PATTERNS: Readonly<Record<HapticName, readonly number[]>> = {
  tap: [8],
  radial: [12],
  error: [20, 40, 20],
  unit: [10, 30, 10],
  hint: [15],
  win: [30, 60, 30, 60, 80],
  combo: [40, 30, 40, 30, 120],
};

/** Short vibrations through the Vibration API, when supported and enabled in settings. */
@Injectable({ providedIn: 'root' })
export class HapticsService {
  private readonly settings = inject(SettingsStore);
  private readonly navigator = inject(DOCUMENT).defaultView?.navigator;

  get supported(): boolean {
    return typeof this.navigator?.vibrate === 'function';
  }

  vibrate(name: HapticName): void {
    if (this.supported && this.settings.haptics()) {
      this.navigator!.vibrate([...HAPTIC_PATTERNS[name]]);
    }
  }
}
