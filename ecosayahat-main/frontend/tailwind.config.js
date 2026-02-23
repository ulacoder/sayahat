module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#10B981',
          foreground: '#FFFFFF',
          hover: '#059669',
          light: '#D1FAE5',
          dark: '#064E3B'
        },
        secondary: {
          DEFAULT: '#F59E0B',
          foreground: '#FFFFFF',
          light: '#FEF3C7'
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif']
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem'
      }
    },
  },
  plugins: [],
}