/** @type {import('tailwindcss').Config} */
export default {
  // Authored template locations scanned for utility classes.
  content: [
    "./resources/**/*.jsx",
    "./resources/**/*.js",
    "./resources/**/*.tsx",
    "./resources/**/*.vue",
    "./resources/views/**/*.blade.php",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          DEFAULT: '#0f172a',
        },
        gold: {
          50: '#fefcf8',
          100: '#fcf6e8',
          200: '#f9ead0',
          300: '#f4d7a8',
          400: '#ebbb74',
          500: '#d4a574',
          600: '#bc8a59',
          700: '#a36f45',
          800: '#8b5a38',
          900: '#754a2f',
          DEFAULT: '#d4a574',
        },
        secondary: '#d4a574',
        accent: '#e74c3c',
        success: '#10b981', // Emerald 500
        warning: '#f59e0b', // Amber 500
        'dark-bg': '#0f172a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}