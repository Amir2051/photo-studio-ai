import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        blue: {
          500: '#3b82f6',
          600: '#2563eb',
        },
        violet: {
          500: '#7c3aed',
          600: '#6d28d9',
        },
        green: {
          500: '#22c55e',
        },
        yellow: {
          500: '#f59e0b',
        },
        red: {
          500: '#ef4444',
        },
      },
      borderColor: {
        DEFAULT: '#475569',
      },
      backgroundColor: {
        primary: '#0f172a',
        secondary: '#1e293b',
        tertiary: '#334155',
      },
      textColor: {
        primary: '#f1f5f9',
        secondary: '#94a3b8',
        muted: '#64748b',
      },
    },
  },
  plugins: [],
} satisfies Config
