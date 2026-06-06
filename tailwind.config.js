/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
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
        warning:  'rgb(var(--color-warning) / <alpha-value>)',
      },
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono:  ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
        serif: ['Lora', 'Georgia', 'Times New Roman', 'serif'],
      },
      // CDS easing curves
      transitionTimingFunction: {
        'cds':    'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'var(--ease-spring)',
      },
      // CDS duration scale
      transitionDuration: {
        'micro':    '35ms',
        'fast':     '60ms',
        'standard': '150ms',
        'slow':     '300ms',
        'spring':   '450ms',
      },
      // CDS border radius
      borderRadius: {
        'cds-sm':   '4px',
        'cds-md':   '6px',
        'cds-lg':   '8px',
        'cds-xl':   '12px',
        'cds-2xl':  '16px',
      },
      // CDS box shadows
      boxShadow: {
        'cds-sm': '0 1px 2px 0 rgba(0,0,0,0.05)',
        'cds-md': '0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.10)',
        'cds-lg': '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.10)',
      },
      // CDS keyframe animations
      keyframes: {
        'cds-fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
        'cds-slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'cds-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'cds-shimmer': {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in':  'cds-fade-in 150ms cubic-bezier(0.4,0,0.2,1) both',
        'slide-up': 'cds-slide-up 300ms cubic-bezier(0.4,0,0.2,1) both',
        'cds-pulse':'cds-pulse 2s ease-in-out infinite',
        'shimmer':  'cds-shimmer 1.5s cubic-bezier(0.4,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
};
