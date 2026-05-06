import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        bg:           'var(--c-bg)',
        surface:      'var(--c-surface)',
        raised:       'var(--c-raised)',
        ink:          'var(--c-ink)',
        'ink-2':      'var(--c-ink-2)',
        'ink-3':      'var(--c-ink-3)',
        'ink-4':      'var(--c-ink-4)',
        line:         'var(--c-line)',
        hover:        'var(--c-hover)',
        selected:     'var(--c-selected)',
        accent:       'var(--c-accent)',
        'accent-bg':  'var(--c-accent-bg)',
        'accent-bdr': 'var(--c-accent-bdr)',
        'accent-fg':  'var(--c-accent-fg)',
        green:        'var(--c-green)',
        'green-bg':   'var(--c-green-bg)',
        'green-fg':   'var(--c-green-fg)',
        'orange-bg':  'var(--c-orange-bg)',
        'orange-fg':  'var(--c-orange-fg)',
      },
    },
  },
  plugins: [],
}

export default config
