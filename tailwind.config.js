/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // CSS variable approach — every color works with Tailwind opacity modifiers
      // e.g. bg-card/50, text-muted/60, border-border/30 all work correctly
      colors: {
        terminal: 'rgb(var(--color-terminal) / <alpha-value>)',
        card:     'rgb(var(--color-card) / <alpha-value>)',
        border:   'rgb(var(--color-border) / <alpha-value>)',
        gold:     'rgb(var(--color-gold) / <alpha-value>)',
        gain:     'rgb(var(--color-gain) / <alpha-value>)',
        loss:     'rgb(var(--color-loss) / <alpha-value>)',
        primary:  'rgb(var(--color-primary) / <alpha-value>)',
        muted:    'rgb(var(--color-muted) / <alpha-value>)',
        accent:   'rgb(var(--color-accent) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
