/**
 * EasyTutor design tokens — the single source of truth for JS-colour
 * decisions. Tailwind classes mirror these values in `tailwind.config.js`;
 * inline styles, icons, SVG and native APIs import from here instead of
 * hardcoding hex codes.
 *
 * Every colour group has a `dark` (default) and `light` variant. Use
 * `getColor(group, shade, scheme)` to resolve the right value for the
 * active colour scheme.
 *
 * `COLORS` is exported flat (dark mode values) for backward compatibility
 * with existing code. `COLORS_LIGHT` provides the light-mode equivalents.
 */

/** Colour scheme. Dark is the default; light is a class toggle. */
export type ColorScheme = 'dark' | 'light';

const brandDark = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#4f7cff',
  600: '#3b63cc',
  700: '#2d4d99',
  800: '#1e3666',
  900: '#0f1f33',
};
const brandLight = {
  50: '#0f1f33',
  100: '#1e3666',
  200: '#2d4d99',
  300: '#3b63cc',
  400: '#4f7cff',
  500: '#3b63cc',
  600: '#2d4d99',
  700: '#1e3666',
  800: '#0f1f33',
  900: '#0d0f12',
};

const surfaceDark = {
  bg: '#0d0f12',
  card: '#161920',
  border: '#2a2f3d',
  elevated: '#1c2029',
};
const surfaceLight = {
  bg: '#fafafa',
  card: '#ffffff',
  border: '#e5e7eb',
  elevated: '#f3f4f6',
};

const textDark = {
  primary: '#ffffff',
  secondary: '#8a8fa3',
  muted: '#5a5f6d',
  inverse: '#0d0f12',
};
const textLight = {
  primary: '#0f172a',
  secondary: '#475569',
  muted: '#94a3b8',
  inverse: '#ffffff',
};

/** Flat dark-mode colours (backward compatible). Existing imports of COLORS keep working. */
export const COLORS = {
  brand: brandDark,
  primary: { DEFAULT: '#4f7cff', light: '#60a5fa', dark: '#3b63cc' },
  background: { DEFAULT: '#0d0f12' },
  surface: surfaceDark,
  text: textDark,
  success: { DEFAULT: '#22c55e', light: '#4ade80', dark: '#16a34a' },
  warning: { DEFAULT: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
  error: { DEFAULT: '#ef4444', light: '#f87171', dark: '#dc2626' },
  accent: { purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899' },
  overlay: 'rgba(13, 15, 18, 0.8)',
} as const;

/** Flat light-mode colours. */
export const COLORS_LIGHT = {
  brand: brandLight,
  primary: { DEFAULT: '#3b63cc', light: '#60a5fa', dark: '#2d4d99' },
  background: { DEFAULT: '#fafafa' },
  surface: surfaceLight,
  text: textLight,
  success: { DEFAULT: '#16a34a', light: '#4ade80', dark: '#22c55e' },
  warning: { DEFAULT: '#d97706', light: '#fbbf24', dark: '#f59e0b' },
  error: { DEFAULT: '#dc2626', light: '#f87171', dark: '#ef4444' },
  accent: { purple: '#7c3aed', cyan: '#0891b2', pink: '#db2777' },
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

/**
 * Resolve a colour token for the given scheme.
 * Falls back to dark if the scheme is unknown or the shade is missing.
 */
export function getColor(
  group: 'brand' | 'primary' | 'background' | 'surface' | 'text' | 'success' | 'warning' | 'error' | 'accent' | 'overlay',
  shade: string,
  scheme: ColorScheme = 'dark',
): string {
  const colors = scheme === 'light' ? COLORS_LIGHT : COLORS;
  const groupColors = (colors as any)[group];
  if (!groupColors) return '#000000';
  const value = (groupColors as Record<string, string>)[shade];
  return value ?? '#000000';
}

export const SPACING = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  full: 9999,
} as const;

export const FONT_FAMILY = {
  display: 'Syne_700Bold',
  body: 'DMSans_400Regular',
  fallback: 'System',
} as const;

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const LINE_HEIGHT = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 40,
} as const;

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const DURATION = {
  instant: 0,
  fast: 150,
  base: 200,
  slow: 320,
} as const;

export const Z_INDEX = {
  base: 0,
  raised: 10,
  overlay: 40,
  toast: 50,
  modal: 60,
} as const;

export type ColorSchemeType = ColorScheme;
export type SpacingToken = keyof typeof SPACING;
export type RadiusToken = keyof typeof RADIUS;
export type FontSizeToken = keyof typeof FONT_SIZE;

export const MOTION = {
  // When the user prefers reduced motion, durations collapse to instant so
  // transitions, fades and haptics stay snappy and never distract.
  reduced: {
    fast: 0,
    base: 0,
    slow: 0,
  },
  full: {
    fast: DURATION.fast,
    base: DURATION.base,
    slow: DURATION.slow,
  },
} as const;

export type MotionMode = 'reduced' | 'full';

export const tokens = {
  colors: COLORS,
  spacing: SPACING,
  radius: RADIUS,
  fontFamily: FONT_FAMILY,
  fontSize: FONT_SIZE,
  lineHeight: LINE_HEIGHT,
  fontWeight: FONT_WEIGHT,
  duration: DURATION,
  motion: MOTION,
  zIndex: Z_INDEX,
} as const;