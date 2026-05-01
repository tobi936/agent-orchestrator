/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'SF Mono',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        term: {
          bg: '#000000',
          panel: '#111111',
          border: '#222222',
          text: '#e0e0e0',
          muted: '#666666',
          accent: '#00FF00',
          blue: '#4444FF',
          warn: '#FFBF00',
          err: '#FF4444',
          ok: '#00FF00',
        },
      },
    },
  },
  plugins: [],
}
