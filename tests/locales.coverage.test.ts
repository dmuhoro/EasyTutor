import { describe, expect, it } from 'vitest';
import en from '../src/locales/en.json';
import sw from '../src/locales/sw.json';
import fr from '../src/locales/fr.json';
import { t, loadLocale, LOCALE_NAMES } from '../src/locales';

type Pack = Record<string, string>;

describe('C30 — i18n pack coverage', () => {
  it('ships the same keys in en, sw and fr', () => {
    const keys = Object.keys(en as Pack).sort();
    expect(keys.length).toBeGreaterThan(100);
    expect(Object.keys(sw as Pack).sort()).toEqual(keys);
    expect(Object.keys(fr as Pack).sort()).toEqual(keys);
  });

  it('never renders an untranslated key from a loaded pack', () => {
    const keys = Object.keys(en as Pack);
    for (const key of keys) {
      expect((sw as Pack)[key]?.trim()).not.toBe('');
      expect((fr as Pack)[key]?.trim()).not.toBe('');
    }
  });

  it('interpolates placeholders and falls back to English for a missing key', async () => {
    await loadLocale('sw');
    await loadLocale('fr');
    expect(t('flagged', { count: 3 }, 'sw')).toBe((sw as Pack).flagged.replace('{{count}}', '3'));
    expect(t('definitely.not.a.key', {}, 'fr')).toBe('definitely.not.a.key');
    expect(LOCALE_NAMES.sw).toContain('Kiswahili');
  });
});
