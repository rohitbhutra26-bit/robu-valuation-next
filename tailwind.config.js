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
        terminal: '#060c18',   // deep navy page bg
        card:     '#0c1628',   // card surface
        border:   '#1e3050',   // subtle navy border
        gold:     '#3b82f6',   // Bloomberg blue — primary accent
        gain:     '#4ade80',   // green for profit/upside (universal)
        loss:     '#f87171',   // red for loss/downside (universal)
        primary:  '#e8f1ff',   // near-white with blue tint
        muted:    '#6b8cae',   // slate-blue secondary text
        accent:   '#60a5fa',   // lighter blue for badges/highlights
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
