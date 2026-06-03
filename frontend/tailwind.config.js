/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309'
        }
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(245, 158, 11, 0.35), 0 24px 60px -24px rgba(245, 158, 11, 0.45)'
      }
    }
  },
  plugins: []
};