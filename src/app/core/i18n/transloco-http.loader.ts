import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

/**
 * Fetches `i18n/{lang}.json` for root keys and `i18n/{scope}/{lang}.json` for feature
 * scopes (Transloco passes `home/en` as the path). Only what is rendered is downloaded.
 */
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(path: string) {
    return this.http.get<Translation>(`i18n/${path}.json`);
  }
}
