export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:   '#0f0f1a',
        cream: '#F5F0E8',
        red:   '#8B1A1A',
        gold:  '#C9A84C',
        steel: '#1a3a5a',
        dim:   '#2a2a3a',
        mist:  '#8a8a9a',
      },
      fontFamily: {
        serif:    ['"Playfair Display"', 'Georgia', 'serif'],
        condensed:['"Barlow Condensed"', 'sans-serif'],
        mono:     ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
