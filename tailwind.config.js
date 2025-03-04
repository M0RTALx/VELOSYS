/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      colors: {
        'apple-black': '#000000',
        'apple-white': '#ffffff',
        'apple-gray': {
          50: '#f9f9f9',
          100: '#f2f2f2',
          200: '#e6e6e6',
          300: '#d1d1d1',
          400: '#a8a8a8',
          500: '#737373',
          600: '#555555',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        'apple-blue': '#0071e3',
        'apple-red': '#ff3b30',
        'apple-green': '#34c759',
      },
      boxShadow: {
        'apple-sm': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'apple-md': '0 4px 24px rgba(0, 0, 0, 0.08)',
        'apple-lg': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'apple-focus': '0 0 0 4px rgba(0, 113, 227, 0.2)',
      },
      borderRadius: {
        'apple': '12px',
        'apple-xl': '16px',
        'apple-button': '980px',
      },
      animation: {
        'apple-pulse': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};