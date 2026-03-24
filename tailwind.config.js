/** @type {import('tailwindcss').Config} */
export default {
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
        primary: '#1a2f4a',
        secondary: '#d4a574',
        accent: '#e74c3c',
        success: '#27ae60',
        warning: '#f39c12',
        'light-bg': '#f5f5f5',
        'text-dark': '#1a2f4a',
        'text-light': '#666666',
        'dark-bg': '#0f1f34',
        gold: '#d4a574',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [],
}