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
        syne: ['Syne_700Bold', 'sans-serif'],
        dmsans: ['DMSans_400Regular', 'sans-serif'],
      },
      // Design tokens - Colors
      colors: {
        // Brand primary
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
        // Surface colors (dark theme)
        surface: {
          bg: '#0d0f12',
          card: '#161920',
          border: '#2a2f3d',
          elevated: '#1c2029',
        },
        // Text hierarchy
        text: {
          primary: '#ffffff',
          secondary: '#8a8fa3',
          muted: '#5a5f6d',
          inverse: '#0d0f12',
        },
        // Status colors
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
        // Accent colors
        accent: {
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          pink: '#ec4899',
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
