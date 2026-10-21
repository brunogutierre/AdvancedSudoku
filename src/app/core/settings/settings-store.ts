import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { PersistenceService, STORAGE_KEYS } from '../persistence/persistence.service';
import type { Settings } from './settings.model';
import { DEFAULT_SETTINGS, detectLang, sanitizeSettings } from './settings.model';

/** User preferences as signals, persisted to localStorage. */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly persistence = inject(PersistenceService);
  private readonly defaults: Settings = {
    ...DEFAULT_SETTINGS,
    lang: detectLang(inject(DOCUMENT).defaultView?.navigator.language),
  };

  private readonly _settings = signal<Settings>(
    sanitizeSettings(this.persistence.load(STORAGE_KEYS.settings, isObject), this.defaults),
  );

  readonly settings = this._settings.asReadonly();
  readonly mistakeMode = computed(() => this._settings().mistakeMode);
  readonly autoCandidatesEasy = computed(() => this._settings().autoCandidatesEasy);
  readonly highlightPeers = computed(() => this._settings().highlightPeers);
  readonly highlightSameDigit = computed(() => this._settings().highlightSameDigit);
  readonly sound = computed(() => this._settings().sound);
  readonly haptics = computed(() => this._settings().haptics);
  readonly reducedMotion = computed(() => this._settings().reducedMotion);
  readonly theme = computed(() => this._settings().theme);
  readonly lang = computed(() => this._settings().lang);

  private readonly saver = this.persistence.createSaver(STORAGE_KEYS.settings, () =>
    this._settings(),
  );

  constructor() {
    effect(() => {
      this._settings();
      this.saver.schedule();
    });
  }

  /** Changes one or more preferences; invalid values are ignored. */
  update(patch: Partial<Settings>): void {
    this._settings.update((current) => sanitizeSettings({ ...current, ...patch }, current));
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.update({ [key]: value } as Partial<Settings>);
  }

  reset(): void {
    this._settings.set(this.defaults);
  }
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}
