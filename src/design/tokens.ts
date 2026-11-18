/**
 * EasyTutor design tokens — the single source of truth for JS-colour
 * decisions. Tailwind classes mirror these values in `tailwind.config.js`;
 * inline styles, icons, SVG and native APIs import from here instead of
 * hardcoding hex codes.
 *
 * Every colour group has a `light` (default) and `dark` variant. Use
 * `getColor(group, shade, scheme)` to resolve the right value for the
 * active colour scheme.
 *
 * `COLORS` is exported flat with the **light** (default) values; `COLORS_DARK`
 * provides the ink scheme. The palette is the Stitch baseline — hexes are
 * extracted from the Stitch project, not invented; see
 * `docs/design/stitch/design-tokens.json`.
 */

/** Colour scheme. Dark is the default; light is a class toggle. */
export type ColorScheme = 'dark' | 'light';

/**
 * Brand scale — Stitch tonal ramp. Light mode runs dark→light (500 is the
 * primary action fill); dark mode shifts 400/500 up to the bright teals so the
 * same component reads correctly on ink.
 */
const brandLight = {
  50: '#bcffe9',
  100: '#97f4d9',
  200: '#7bd7bd',
  300: '#4edea3',
  400: '#0e7c66',
  500: '#00614f',
  600: '#005141',
  700: '#003824',
  800: '#0b1f2a',
  900: '#101414',
};
const brandDark = {
  50: '#e8fff7',
  100: '#bcffe9',
  200: '#97f4d9',
  300: '#7bd7bd',
  400: '#4edea3',
  500: '#7bd7bd',
  600: '#97f4d9',
  700: '#bcffe9',
  800: '#e0e3e2',
  900: '#ffffff',
};

const surfaceLight = {
  bg: '#fcf9f3',
  card: '#ffffff',
  // Stitch `surface-container-low` — inset blocks inside a white card.
  subtle: '#f6f3ed',
  border: '#bdc9c4',
  elevated: '#f0eee8',
};
const surfaceDark = {
  bg: '#101414',
  card: '#1c2020',
  subtle: '#181c1c',
  border: '#3c4a42',
  elevated: '#272b2b',
};

const textLight = {
  primary: '#1c1c18',
  secondary: '#3e4945',
  muted: '#6e7a75',
  inverse: '#ffffff',
};
const textDark = {
  primary: '#e0e3e2',
  secondary: '#bbcabf',
  muted: '#86948a',
  inverse: '#101414',
};

/**
 * Flat colours for the **default (light) scheme**. The app is light-first per
 * the Stitch baseline; `COLORS_DARK` carries the ink scheme and is resolved by
 * `getColor(group, shade, 'dark')` or by a screen that explicitly renders a
 * dark surface.
 */
export const COLORS = {
  brand: brandLight,
  primary: { DEFAULT: '#00614f', light: '#0e7c66', dark: '#005141' },
  background: { DEFAULT: '#fcf9f3' },
  surface: surfaceLight,
  text: textLight,
  // The design expresses success with the primary teal, not a separate green.
  success: { DEFAULT: '#00614f', light: '#0e7c66', dark: '#005141' },
  warning: {
    DEFAULT: '#835400',
    light: '#f2a93b',
    dark: '#6e4600',
    container: '#ffddb5',
    'on-container': '#2a1800',
  },
  error: {
    DEFAULT: '#ba1a1a',
    light: '#d64545',
    dark: '#93000a',
    container: '#ffdad6',
    'on-container': '#93000a',
  },
  accent: { purple: '#835400', cyan: '#006b57', pink: '#455864' },
  overlay: 'rgba(28, 28, 24, 0.5)',
} as const;

/** Backwards-compatible alias: `COLORS` is the light scheme. */
export const COLORS_LIGHT = COLORS;

/** Flat colours for the ink (dark) scheme. */
export const COLORS_DARK = {
  brand: brandDark,
  primary: { DEFAULT: '#4edea3', light: '#7bd7bd', dark: '#97f4d9' },
  background: { DEFAULT: '#101414' },
  surface: surfaceDark,
  text: textDark,
  success: { DEFAULT: '#4edea3', light: '#7bd7bd', dark: '#97f4d9' },
  warning: {
    DEFAULT: '#ffb95f',
    light: '#fdb244',
    dark: '#ee9800',
    container: '#ffddb8',
    'on-container': '#2a1700',
  },
  error: {
    DEFAULT: '#ffb4ab',
    light: '#ffdad6',
    dark: '#93000a',
    container: '#93000a',
    'on-container': '#ffdad6',
  },
  accent: { purple: '#ffb95f', cyan: '#3cddc7', pink: '#bbcabf' },
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

/**
 * Resolve a colour token for the given scheme.
 * Defaults to light (the product default); an unknown shade returns black so a
 * typo is visible rather than silently transparent.
 */
export function getColor(
  group: 'brand' | 'primary' | 'background' | 'surface' | 'text' | 'success' | 'warning' | 'error' | 'accent' | 'overlay',
  shade: string,
  scheme: ColorScheme = 'light',
): string {
  const colors = scheme === 'dark' ? COLORS_DARK : COLORS;
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
  // DM Sans only (Stitch baseline). `display` is the bold cut, not a second face.
  display: 'DMSans_700Bold',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  // Formulas and code. Platform monospace until JetBrains Mono is bundled.
  mono: 'monospace',
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