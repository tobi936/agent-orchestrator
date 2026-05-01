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
          bg: '#0b0d10',
          panel: '#11151a',
          border: '#1e2530',
          text: '#d6deeb',
          muted: '#7a8aa3',
          accent: '#7fdbca',
          warn: '#ffcb6b',
          err: '#ff6b6b',
          ok: '#a3f7a3',
        },
      },
    },
  },
  plugins: [],
}
