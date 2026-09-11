/**
 * DESIGN SYSTEM CONTRACTS
 * 
 * Foundational tokens and contracts for the platform's unified UX architecture.
 */

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  success: string;
}

export interface TypographyTokens {
  fontFamily: string;
  baseSize: string;
  headingScale: number;
}

export interface DesignSystemTheme {
  name: string;
  colors: ColorPalette;
  typography: TypographyTokens;
  borderRadius: string;
}

export const DEFAULT_THEME: DesignSystemTheme = {
  name: 'Modern Dark',
  colors: {
    primary: '#6366f1',
    secondary: '#a855f7',
    accent: '#22d3ee',
    background: '#0f172a',
    surface: '#1e293b',
    error: '#ef4444',
    success: '#22c55e'
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    baseSize: '16px',
    headingScale: 1.25
  },
  borderRadius: '8px'
};
