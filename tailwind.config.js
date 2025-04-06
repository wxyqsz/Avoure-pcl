/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        playfair: ["'Playfair Display'", 'serif'], // Vogue-style font
      },
      letterSpacing: {
        widest: '.25em', // Extra spacing for luxury look
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
