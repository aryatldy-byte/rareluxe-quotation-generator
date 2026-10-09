/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FDF7EE',
        band: '#F7F0DE',
        pine: '#1F3A3D',
        gold: '#A9852D',
        glow: '#E8C86A',
        ink: '#2D2D2D',
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
