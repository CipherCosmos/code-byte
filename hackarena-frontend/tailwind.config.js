/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: '#e5e7eb',
        background: '#ffffff',
        ring: '#1e40af',
        card: {
          foreground: '#111827'
        },
        muted: {
          foreground: '#6b7280'
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#1e40af',
          600: '#1e40af',
          700: '#1d4ed8',
          900: '#1e3a8a'
        },
        dsba: {
          navy: '#1e40af',
          gold: '#fbbf24',
          white: '#ffffff',
          gray: '#6b7280',
          light: '#f8fafc'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite'
      }
    },
  },
  plugins: [],
}