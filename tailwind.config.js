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
        terminal: '#0A0E1A',
        card: '#111827',
        border: '#2D3748',        // slightly lighter — borders now visible
        gold: '#F59E0B',
        gain: '#10B981',
        loss: '#EF4444',
        primary: '#F9FAFB',
        muted: '#A1A9B8',         // was #6B7280 — bumped for WCAG AA contrast
        accent: '#60A5FA',        // blue-400, readable on dark bg
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
