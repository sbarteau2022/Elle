/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:   '#0f0f1a',
        card:  '#13131f',
        red:   '#8B1A1A',
        gold:  '#C9A84C',
        cream: '#F5F0E8',
        steel: '#1a3a5a',
        dim:   '#6a6a7a',
        mist:  '#8a8a9a',
      },
      fontFamily: {
        display:  ['"Playfair Display"', 'Georgia', 'serif'],
        body:     ['"Barlow Condensed"', 'sans-serif'],
        mono:     ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
