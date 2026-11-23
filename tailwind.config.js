/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#3A3730',
        'ink-soft': '#635E54',
        cream: '#F3EFE6',
        ivory: '#FBF8F1',
        parchment: '#E9E0CF',
        sand: '#D9BE8F',
        sage: '#93A87B',
        'sage-deep': '#6F8558',
        moss: '#556B45',
        gold: '#E0B15E',
        'gold-deep': '#C2914C',
        'gold-ink': '#B8860B',
        terracotta: '#D08A67',
        'terracotta-deep': '#B86847',
        rose: '#D98A92',
        sky: '#8FC6D8',
        slate: '#7E8B99',
        night: '#161412',
        'night-soft': '#20242C',
      },
      fontFamily: {
        display: ['Georgia', 'Iowan Old Style', 'Palatino Linotype', 'serif'],
        sans: [
          'Avenir Next',
          'Avenir',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        panel: '0 26px 70px -34px rgba(58, 55, 48, 0.55)',
        float: '0 14px 38px -20px rgba(58, 55, 48, 0.45)',
        'inner-soft': 'inset 0 1px 0 rgba(255, 255, 255, 0.65)',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-14px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'panel-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'coin-pop': {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.14)' },
          '100%': { transform: 'scale(1)' },
        },
        'soft-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'toast-in': 'toast-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'panel-in': 'panel-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'coin-pop': 'coin-pop 340ms ease-out',
        'soft-float': 'soft-float 5.5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
