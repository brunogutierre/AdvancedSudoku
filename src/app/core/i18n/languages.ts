export const LANGS = ['en', 'pt-BR', 'es', 'fr'] as const;

export type Lang = (typeof LANGS)[number];

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

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/** Maps a BCP 47 tag (`pt-PT`, `fr-CA`, `es`) to a supported language, or null. */
export function matchLang(tag: string | null | undefined): Lang | null {
  if (!tag) {
    return null;
  }
  const base = tag.toLowerCase().split('-')[0];
  if (base === 'pt') {
    return 'pt-BR';
  }
  return LANGS.find((lang) => lang === base) ?? null;
}
