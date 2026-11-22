/**
 * G-03 — prove that the keys added for the setup screen resolve at runtime.
 *
 * The static gate checks that a key exists in every pack; this test checks the
 * real `t()` boundary actually returns copy instead of the raw key name. Packs
 * use flat dotted keys, so the resolver must honour them before its legacy
 * nested traversal.
 */
import { describe, it, expect } from 'vitest';

import { t, loadLocale, type Locale } from '../../src/locales';

const KEYS = [
  'back',
  'subjects.biology',
  'subjects.chemistry',
  'subjects.computer_science',
  'subjects.history',
  'subjects.math',
  'subjects.physics',
];

describe('setup-screen keys resolve in every shipped locale', () => {
  it('English returns real copy, not the raw key', () => {
    expect(t('subjects.math')).toBe('Mathematics');
    expect(t('back')).toBe('Back');
  });

  it.each<Locale>(['sw', 'fr'])('%s resolves every key', async (locale) => {
    await loadLocale(locale);
    for (const key of KEYS) {
      const value = t(key, undefined, locale);
      expect(value).not.toBe(key);
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('an unknown key still fails closed to its own name', () => {
    expect(t('subjects.not_a_real_key')).toBe('subjects.not_a_real_key');
  });
});
