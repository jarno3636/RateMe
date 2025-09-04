import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0a0f1a'
        }
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0,0,0,0.25)'
      }
    }
  },
  plugins: []
} satisfies Config
