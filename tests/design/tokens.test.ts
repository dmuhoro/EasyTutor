import { describe, expect, it } from 'vitest';
import { COLORS, RADIUS, SPACING, FONT_SIZE, tokens } from '../../src/design/tokens';
import { COLORS as THEME_COLORS } from '../../lib/theme';

const srgb = (value: number) =>
  value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

const luminance = (hex: string) => {
  const clean = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => srgb(parseInt(clean.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

const HEX = /^#[0-9a-f]{6}$/i;

describe('design tokens', () => {
  it('keeps lib/theme and the design tokens in sync', () => {
    expect(THEME_COLORS).toBe(COLORS);
  });

  it('uses valid hex values for every colour token', () => {
    const flat: string[] = [];
    for (const group of Object.values(COLORS)) {
      if (typeof group === 'string') flat.push(group);
      else flat.push(...Object.values(group));
    }
    for (const value of flat) {
      if (value.startsWith('rgba')) continue;
      expect(value).toMatch(HEX);
    }
  });

  it('meets WCAG AA for body text on app surfaces', () => {
    expect(contrast(COLORS.text.primary, COLORS.surface.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.text.primary, COLORS.surface.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.text.secondary, COLORS.surface.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.text.secondary, COLORS.surface.card)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps brand, error and success readable on cards', () => {
    expect(contrast(COLORS.brand[500], COLORS.surface.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.error.DEFAULT, COLORS.surface.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.success.DEFAULT, COLORS.surface.card)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps muted text at least 3:1 for large/meta text', () => {
    expect(contrast(COLORS.text.muted, COLORS.surface.bg)).toBeGreaterThanOrEqual(3);
  });

  it('has a monotonic spacing and radius scale', () => {
    const spacing = Object.values(SPACING);
    const radius = Object.values(RADIUS).filter((v) => v !== RADIUS.full);
    const fontSizes = Object.values(FONT_SIZE);
    for (const scale of [spacing, radius, fontSizes]) {
      for (let i = 1; i < scale.length; i++) {
        expect(scale[i]).toBeGreaterThan(scale[i - 1]);
      }
    }
  });

  it('exposes the same values through the aggregate tokens object', () => {
    expect(tokens.colors).toBe(COLORS);
    expect(tokens.spacing).toBe(SPACING);
    expect(tokens.radius).toBe(RADIUS);
  });
});
