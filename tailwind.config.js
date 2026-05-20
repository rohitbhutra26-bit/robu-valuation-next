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
        terminal: '#07111f',   // deep navy page bg
        card:     '#0e1e32',   // card surface — slightly lighter for contrast
        border:   '#1f3558',   // visible navy border
        gold:     '#60a5fa',   // blue accent — bright enough to read
        gain:     '#4ade80',   // green for profit (universal)
        loss:     '#f87171',   // red for loss (universal)
        primary:  '#f0f6ff',   // near-white — very high contrast
        muted:    '#93b4d4',   // light blue-grey — passes WCAG AA
        accent:   '#7dd3fc',   // sky blue for badges/highlights
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
