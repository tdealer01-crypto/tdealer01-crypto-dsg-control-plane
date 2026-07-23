const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    {
      raw: `{${['app/**/*.{js,ts,jsx,tsx,mdx}', 'components/**/*.{js,ts,jsx,tsx,mdx}', 'lib/**/*.{js,ts,jsx,tsx,mdx}']
        .filter(p => !p.includes('llms-full.txt'))
        .join(',')}}`,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
