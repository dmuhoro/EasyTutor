/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: { 
    extend: {
      fontFamily: {
        // `syne` is a legacy alias kept so 368 existing call-sites keep one
        // display face: DM Sans Bold. Rename to `font-display` over time.
        syne: ['DMSans_700Bold', 'sans-serif'],
        dmsans: ['DMSans_400Regular', 'sans-serif'],
        'dmsans-medium': ['DMSans_500Medium', 'sans-serif'],
        'dmsans-semibold': ['DMSans_600SemiBold', 'sans-serif'],
        'dmsans-bold': ['DMSans_700Bold', 'sans-serif'],
        mono: ['monospace'],
      },
      // Design tokens - Colors. Mirror of `src/design/tokens.ts` (light scheme).
      colors: {
        // Brand tonal ramp (Stitch)
        brand: {
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
        },
        primary: {
          DEFAULT: '#00614f',
          light: '#0e7c66',
          dark: '#005141',
        },
        background: {
          DEFAULT: '#fcf9f3',
        },
        // Surface colors (light scheme)
        surface: {
          bg: '#fcf9f3',
          card: '#ffffff',
          border: '#bdc9c4',
          elevated: '#f0eee8',
        },
        // Text hierarchy
        text: {
          primary: '#1c1c18',
          secondary: '#3e4945',
          muted: '#6e7a75',
          inverse: '#ffffff',
        },
        // Status colors — success is the primary teal by design
        success: {
          DEFAULT: '#00614f',
          light: '#0e7c66',
          dark: '#005141',
        },
        warning: {
          DEFAULT: '#835400',
          light: '#f2a93b',
          dark: '#6e4600',
        },
        error: {
          DEFAULT: '#ba1a1a',
          light: '#d64545',
          dark: '#93000a',
        },
        // Accent colors
        accent: {
          purple: '#835400',
          cyan: '#006b57',
          pink: '#455864',
        },
      },
      // Spacing scale
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      // Border radius scale
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '40px',
        'full': '9999px',
      },
      // Typography scale
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
      },
      // Animation durations
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'progress': 'progress 1s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        progress: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width)' },
        },
      },
    } 
  },
  darkMode: 'class',
  plugins: [],
}
