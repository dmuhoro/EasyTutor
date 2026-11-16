import en from './en.json';
import sw from './sw.json';
import fr from './fr.json';

export type Locale = 'en' | 'sw' | 'fr';

export const LOCALES: Record<Locale, typeof en> = {
  en,
  sw,
  fr,
} as const;

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  sw: 'Kiswahili (DRAFT)',
  fr: 'Français (DRAFT)',
} as const;

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Get a translated string for the given key and locale.
 * Supports simple {{placeholder}} interpolation.
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE, params?: Record<string, string | number>): string {
  const translations = LOCALES[locale];
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
