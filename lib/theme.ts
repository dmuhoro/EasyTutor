import type { Theme } from '@react-navigation/native';
import { COLORS, RADIUS, SPACING } from '../src/design/tokens';

// Re-export the canonical tokens so existing imports keep working while the
// values live in one place (`src/design/tokens.ts`).
export { COLORS, SPACING };
export const BORDER_RADIUS = RADIUS;

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
