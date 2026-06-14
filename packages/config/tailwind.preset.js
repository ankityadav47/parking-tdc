/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eefbf3',
          100: '#d6f5e1',
          200: '#b0eac6',
          300: '#7dd9a3',
          400: '#48c07c',
          500: '#25a35e',
          600: '#18834a',
          700: '#15693d',
          800: '#145332',
          900: '#12452a',
          950: '#082717',
        },
        surface: {
          DEFAULT: '#0f1117',
          50:  '#1a1d27',
          100: '#14171f',
          200: '#0f1117',
          300: '#090b0f',
        },
        accent: {
          DEFAULT: '#f59e0b',
          light:   '#fcd34d',
          dark:    '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow-brand': '0 0 24px 0 rgba(37,163,94,0.35)',
        'glow-accent': '0 0 24px 0 rgba(245,158,11,0.35)',
        card: '0 4px 24px 0 rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
