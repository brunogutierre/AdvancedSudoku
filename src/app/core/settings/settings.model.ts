export type MistakeMode = 'conflicts' | 'solution' | 'off';
export type ReducedMotion = 'system' | 'on' | 'off';
export type Theme = 'system' | 'light' | 'dark';
export type Lang = 'en' | 'pt-BR' | 'es' | 'fr';

export interface Settings {
  /** 'conflicts': flag cells breaking the rules; 'solution': flag wrong digits and count mistakes; 'off'. */
  readonly mistakeMode: MistakeMode;
  /** Fill all pencil marks when an easy game starts. */
  readonly autoCandidatesEasy: boolean;
  readonly highlightPeers: boolean;
  readonly highlightSameDigit: boolean;
  readonly sound: boolean;
  readonly haptics: boolean;
  readonly reducedMotion: ReducedMotion;
  readonly theme: Theme;
  readonly lang: Lang;
}

export const LANGS: readonly Lang[] = ['en', 'pt-BR', 'es', 'fr'];

export const DEFAULT_SETTINGS: Settings = {
  mistakeMode: 'conflicts',
  autoCandidatesEasy: true,
  highlightPeers: true,
  highlightSameDigit: true,
  sound: false,
  haptics: true,
  reducedMotion: 'system',
  theme: 'system',
  lang: 'en',
};

const ALLOWED: { readonly [K in keyof Settings]: readonly Settings[K][] } = {
  mistakeMode: ['conflicts', 'solution', 'off'],
  autoCandidatesEasy: [true, false],
  highlightPeers: [true, false],
  highlightSameDigit: [true, false],
  sound: [true, false],
  haptics: [true, false],
  reducedMotion: ['system', 'on', 'off'],
  theme: ['system', 'light', 'dark'],
  lang: LANGS,
};

/**
 * Builds settings from untrusted data field by field: valid fields are kept, anything
 * missing or invalid falls back to `defaults`. Never throws.
 */
export function sanitizeSettings(value: unknown, defaults: Settings = DEFAULT_SETTINGS): Settings {
  const source =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const result: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(ALLOWED) as (keyof Settings)[]) {
    if ((ALLOWED[key] as readonly unknown[]).includes(source[key])) result[key] = source[key];
  }
  return result as unknown as Settings;
}

/** Maps a BCP 47 tag such as "pt-PT" or "fr-CA" to a supported language. */
export function detectLang(tag: string | undefined): Lang {
  const lower = (tag ?? '').toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  return 'en';
}
