import type { Lang } from '../settings/settings.model';

export type { Lang };

export const LANGS: readonly Lang[] = ['en', 'pt-BR', 'es', 'fr'];

export const DEFAULT_LANG: Lang = 'en';

/** Endonyms (each language in its own language) and the short code shown on the button. */
export const LANG_LABELS: Readonly<
  Record<Lang, { readonly name: string; readonly short: string }>
> = {
  en: { name: 'English', short: 'EN' },
  'pt-BR': { name: 'Português (Brasil)', short: 'PT' },
  es: { name: 'Español', short: 'ES' },
  fr: { name: 'Français', short: 'FR' },
};
