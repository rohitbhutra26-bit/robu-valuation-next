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
        terminal: '#000000',
        card: '#0F0F0F',
        border: '#1E1E1E',
        gold: '#F59E0B',
        gain: '#10B981',
        loss: '#EF4444',
        primary: '#F9FAFB',
        muted: '#A1A9B8',
        accent: '#60A5FA',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
