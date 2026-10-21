import { DOCUMENT, Injectable, effect, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { SettingsStore } from '../settings/settings-store';
import { Lang } from './languages';

/**
 * Keeps Transloco and `<html lang>` in sync with the language setting. SettingsStore owns
 * the value (persisted choice, else the browser language); the document title follows
 * through TranslatedTitleStrategy.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly settings = inject(SettingsStore);
  private readonly transloco = inject(TranslocoService);

  readonly lang = this.settings.lang;

  constructor() {
    effect(() => this.apply(this.lang()));
    this.apply(this.lang());
  }

  setLang(lang: Lang): void {
    this.settings.set('lang', lang);
    this.apply(lang);
  }

  private apply(lang: Lang): void {
    if (this.transloco.getActiveLang() !== lang) {
      this.transloco.setActiveLang(lang);
    }
    this.document.documentElement.lang = lang;
  }
}
