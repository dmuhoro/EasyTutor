import type { Theme } from '@react-navigation/native';
import { COLORS, COLORS_DARK, RADIUS, SPACING } from '../src/design/tokens';

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
  background: COLORS.surface.bg,
  card: COLORS.surface.card,
  text: COLORS.text.primary,
  border: COLORS.surface.border,
  notification: COLORS.error.DEFAULT,
} as const;

const DARK_COLORS = {
  primary: COLORS_DARK.brand[400],
  background: COLORS_DARK.surface.bg,
  card: COLORS_DARK.surface.card,
  text: COLORS_DARK.text.primary,
  border: COLORS_DARK.surface.border,
  notification: COLORS_DARK.error.DEFAULT,
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
