/** @type {import('tailwindcss').Config} */
const { heroui } = require('@heroui/react');
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: { extend: {} },
  plugins: [heroui()],
};
