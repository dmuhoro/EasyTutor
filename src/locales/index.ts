import en from './en.json';

export type Locale = 'en' | 'sw' | 'fr';

/**
 * Loaded translation packs.
 *
 * Only the default pack is bundled eagerly. The login route (and every other
 * route) must not pay for translations it cannot display, and no screen
 * selects a non-default locale yet. `loadLocale` fetches a pack on demand
 * before a language switch takes effect; until then `t()` falls back to
 * English exactly as it does for a missing key.
 */
const PACKS: Partial<Record<Locale, typeof en>> = { en };

export const LOCALES = PACKS as Record<Locale, typeof en>;

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  sw: 'Kiswahili (DRAFT)',
  fr: 'Français (DRAFT)',
} as const;

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Load a translation pack into memory. Safe to call repeatedly; resolves
 * immediately for packs that are already loaded.
 */
export async function loadLocale(locale: Locale): Promise<void> {
  if (PACKS[locale]) return;
  const loaded = locale === 'sw' ? await import('./sw.json') : await import('./fr.json');
  PACKS[locale] = (loaded.default ?? loaded) as typeof en;
}

/**
 * Get a translated string for the given key and locale.
 * Supports simple {{placeholder}} interpolation.
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const translations = PACKS[locale] ?? en;
  const keys = key.split('.');
  let value: any = translations;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fall back to English if translation missing in target locale
      value = en;
      for (const kk of keys) {
        value = value?.[kk];
        if (value === undefined) return key;
      }
      break;
    }
  }

  if (typeof value !== 'string') return key;

  // Simple {{placeholder}} replacement
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      return params?.[key] !== undefined ? String(params[key]) : `{{${key}}}`;
    });
  }

  return value;
}
