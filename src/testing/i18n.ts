import { EnvironmentProviders, importProvidersFrom } from '@angular/core';
import { Translation, TranslocoTestingModule } from '@jsverse/transloco';
import en from '../../public/i18n/en.json';
import es from '../../public/i18n/es.json';
import { LANGS } from '../app/core/i18n/languages';

/**
 * Real English and Spanish root dictionaries, preloaded synchronously for component tests.
 * Pass feature scopes as `{ 'home/en': homeEn }`.
 */
export function provideTranslocoTesting(
  scopes: Record<string, Translation> = {},
): EnvironmentProviders {
  return importProvidersFrom(
    TranslocoTestingModule.forRoot({
      langs: { en, es, ...scopes },
      translocoConfig: {
        availableLangs: [...LANGS],
        defaultLang: 'en',
        reRenderOnLangChange: true,
      },
      preloadLangs: true,
    }),
  );
}
