import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EBF2FA',
          100: '#C7DDEF',
          200: '#A3C8E4',
          300: '#7FB3D9',
          400: '#5B9ECE',
          500: '#3789C3',
          600: '#1B4F8E',
          700: '#163E70',
          800: '#112E52',
          900: '#0C1E34',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
