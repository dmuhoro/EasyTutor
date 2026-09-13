import type { Theme } from '@react-navigation/native';

// Design tokens matching tailwind.config.js
export const COLORS = {
  brand: {
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
  },
  primary: {
    DEFAULT: '#4f7cff',
    light: '#60a5fa',
    dark: '#3b63cc',
  },
  background: {
    DEFAULT: '#0d0f12',
  },
  surface: {
    bg: '#0d0f12',
    card: '#161920',
    border: '#2a2f3d',
    elevated: '#1c2029',
  },
  text: {
    primary: '#ffffff',
    secondary: '#8a8fa3',
    muted: '#5a5f6d',
    inverse: '#0d0f12',
  },
  success: {
    DEFAULT: '#22c55e',
    light: '#4ade80',
    dark: '#16a34a',
  },
  warning: {
    DEFAULT: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  error: {
    DEFAULT: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  accent: {
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    pink: '#ec4899',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  full: 9999,
} as const;

const FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  bold: { fontFamily: 'System', fontWeight: '700' },
  heavy: { fontFamily: 'System', fontWeight: '800' },
} as const;

const LIGHT_COLORS = {
  primary: COLORS.brand[500],
  background: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  border: '#e5e7eb',
  notification: COLORS.error.DEFAULT,
} as const;

const DARK_COLORS = {
  primary: COLORS.brand[400],
  background: COLORS.surface.bg,
  card: COLORS.surface.card,
  text: COLORS.text.primary,
  border: COLORS.surface.border,
  notification: COLORS.error.light,
} as const;

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    dark: false,
    colors: LIGHT_COLORS,
    fonts: FONTS,
  },
  dark: {
    dark: true,
    colors: DARK_COLORS,
    fonts: FONTS,
  },
};
