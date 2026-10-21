import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { LocalStorage, STORAGE_PREFIX } from '../storage/local-storage';
import { DEFAULT_LANG, Lang, isLang, matchLang } from './languages';

export const LANG_STORAGE_KEY = `${STORAGE_PREFIX}lang`;

/**
 * Single source of truth for the active language: persisted choice, else the browser
 * preference, else English. Keeps Transloco and `<html lang>` in sync; the document title
 * follows through TranslatedTitleStrategy.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(LocalStorage);
  private readonly transloco = inject(TranslocoService);
  private readonly _lang = signal<Lang>(this.initialLang());

  readonly lang = this._lang.asReadonly();

  constructor() {
    this.apply(this._lang());
  }

  setLang(lang: Lang): void {
    if (lang === this._lang()) {
      return;
    }
    this._lang.set(lang);
    this.storage.set(LANG_STORAGE_KEY, lang);
    this.apply(lang);
  }

  private apply(lang: Lang): void {
    this.transloco.setActiveLang(lang);
    this.document.documentElement.lang = lang;
  }

  private initialLang(): Lang {
    const stored = this.storage.get(LANG_STORAGE_KEY);
    if (isLang(stored)) {
      return stored;
    }
    const navigator = this.document.defaultView?.navigator;
    const preferred = navigator?.languages?.length ? navigator.languages : [navigator?.language];
    for (const tag of preferred) {
      const match = matchLang(tag);
      if (match) {
        return match;
      }
    }
    return DEFAULT_LANG;
  }
}
