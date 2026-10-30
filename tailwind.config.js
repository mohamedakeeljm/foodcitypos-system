/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pos: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          primary: '#e11d48',
          primaryHover: '#be123c',
          accent: '#3b82f6',
          warning: '#f59e0b',
          danger: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
