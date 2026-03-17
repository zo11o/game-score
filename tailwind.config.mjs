import { heroui } from '@heroui/react';

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {},
  darkMode: 'class',
  plugins: [
    heroui({
      defaultTheme: 'light',
      themes: {
        light: {
          extend: 'light',
          colors: {
            primary: {
              50: '#f1f8f3',
              100: '#dceedd',
              200: '#bdddbc',
              300: '#9bc99a',
              400: '#79b378',
              500: '#5f985f',
              600: '#4d7d4f',
              700: '#3f6641',
              800: '#355336',
              900: '#2d442f',
              DEFAULT: '#5f985f',
              foreground: '#ffffff',
            },
            secondary: {
              50: '#f6fbf4',
              100: '#ebf6e7',
              200: '#d4eacb',
              300: '#b6daab',
              400: '#94c48a',
              500: '#78ad70',
              600: '#5f8f5b',
              700: '#4d724b',
              800: '#415d40',
              900: '#374d36',
              DEFAULT: '#78ad70',
              foreground: '#ffffff',
            },
            success: {
              50: '#f3fbf4',
              100: '#e3f5e6',
              200: '#c8e8cf',
              300: '#a3d5af',
              400: '#7ebe8b',
              500: '#5ea36b',
              600: '#4a8558',
              700: '#3b6947',
              800: '#31553a',
              900: '#2a4731',
              DEFAULT: '#5ea36b',
              foreground: '#ffffff',
            },
          },
        },
      },
    }),
  ],
};

export default config;
