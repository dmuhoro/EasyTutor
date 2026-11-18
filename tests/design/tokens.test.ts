import { describe, expect, it } from 'vitest';
import { COLORS, COLORS_DARK, RADIUS, SPACING, FONT_SIZE, getColor, tokens } from '../../src/design/tokens';
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
    expect(contrast(COLORS.brand[500], COLORS.surface.card)).toBeGreaterThanOrEqual(3);
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

describe('dark scheme tokens', () => {
  it('meets WCAG AA for body text on both dark surfaces', () => {
    expect(contrast(COLORS_DARK.text.primary, COLORS_DARK.surface.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS_DARK.text.primary, COLORS_DARK.surface.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS_DARK.text.secondary, COLORS_DARK.surface.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS_DARK.text.secondary, COLORS_DARK.surface.card)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the dark primary readable as text and as a fill', () => {
    expect(contrast(COLORS_DARK.primary.DEFAULT, COLORS_DARK.surface.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS_DARK.text.inverse, COLORS_DARK.primary.DEFAULT)).toBeGreaterThanOrEqual(4.5);
  });

  it('resolves each scheme through getColor', () => {
    expect(getColor('surface', 'bg', 'light')).toBe(COLORS.surface.bg);
    expect(getColor('surface', 'bg', 'dark')).toBe(COLORS_DARK.surface.bg);
    expect(getColor('surface', 'bg')).toBe(COLORS.surface.bg); // light is the default
    expect(getColor('surface', 'not-a-shade', 'dark')).toBe('#000000');
  });

  it('keeps the two schemes visually distinct', () => {
    expect(COLORS.surface.bg).not.toBe(COLORS_DARK.surface.bg);
    expect(COLORS.text.primary).not.toBe(COLORS_DARK.text.primary);
  });
});
