/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './Storefront.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        primary: {
          light: '#3b82f6',
          DEFAULT: '#1e40af',
          dark: '#1d4ed8',
        },
        secondary: {
          light: '#10b981',
          DEFAULT: '#059669',
          dark: '#047857',
        },
        accent: {
          light: '#fbbf24',
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translate3d(0, -20px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translate3d(0, 16px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translate3d(0, 20px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        slowZoom: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.08)' },
        },
        bounceShort: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        ticker: 'ticker 60s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-in-out forwards',
        'fade-in-down': 'fadeInDown 0.45s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.35s ease-out forwards',
        'slow-zoom': 'slowZoom 14s ease-out forwards',
        'bounce-short': 'bounceShort 0.9s ease-in-out infinite',
        'bounce-slow': 'bounceSlow 2.6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'float-slow': 'floatSlow 5s ease-in-out infinite',
        'scale-in': 'scaleIn 0.25s ease-out forwards',
      },
    },
  },
  plugins: [],
};
