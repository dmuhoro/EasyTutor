import { createContext, useCallback, useContext, useState } from 'react';
import en from './en.json';
import sw from './sw.json';
import fr from './fr.json';

const LOCALES: Record<string, Record<string, any>> = {
  en,
  sw,
  fr,
};

// Locales that are machine-translated and not yet reviewed. Shown as DRAFT in
// the UI so learners never mistake them for final, human-verified copy.
export const DRAFT_LOCALES = new Set(['sw', 'fr']);

let currentLocale = 'en';

/**
 * Translation context value. Consumers call `t()` to translate a key, and the
 * provider re-renders all subscribers when the locale changes.
 */
interface TranslationContextValue {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: () => string;
  setLocale: (locale: string) => void;
  isDraft: (locale: string) => boolean;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

/**
 * Resolve a translated string for the current locale, falling back to English
 * and then to the raw key so the UI never renders undefined.
 *
 * Supports simple {{param}} interpolation. Skips non-string keys such as
 * `_meta` so machine-translation metadata never leaks into the UI.
 */
function getString(localeMap: Record<string, any>, key: string): string {
  const value = localeMap[key];
  if (typeof value === 'string') return value;
  return '';
}

export function t(key: string, params?: Record<string, string | number>): string {
  const localeMap = LOCALES[currentLocale] ?? LOCALES.en;
  let text = getString(localeMap, key) ?? getString(LOCALES.en, key) ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    }
  }
  return text;
}

/** The currently active locale code ('en' | 'sw' | 'fr'). */
export function getLocale(): string {
  return currentLocale;
}

/** Whether a locale is a DRAFT (machine-translated, unreviewed) locale. */
export function isDraftLocale(locale: string): boolean {
  return DRAFT_LOCALES.has(locale);
}

/**
 * Switch the active locale. All `useTranslation()` subscribers re-render.
 * Silently ignores unknown locale codes.
 */
export function setLocale(locale: string): void {
  if (LOCALES[locale]) {
    currentLocale = locale;
  }
}

/**
 * Provides translation to the whole app. Wrap the root layout or the app
 * shell so every screen can call `useTranslation()`.
 */
export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<string>(currentLocale);

  const value: TranslationContextValue = {
    t: useCallback(
      (key: string, params?: Record<string, string | number>) => {
        const localeMap = LOCALES[locale] ?? LOCALES.en;
        let text = getString(localeMap, key) ?? getString(LOCALES.en, key) ?? key;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
          }
        }
        return text;
      },
      [locale]
    ),
    locale: () => locale,
    setLocale: useCallback((next: string) => {
      if (LOCALES[next]) {
        currentLocale = next;
        setLocaleState(next);
      }
    }, []),
    isDraft: (l: string) => DRAFT_LOCALES.has(l),
  };

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

/**
 * Hook to access translations. Must be used inside a TranslationProvider.
 */
export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return ctx;
}

export type { TranslationContextValue };
