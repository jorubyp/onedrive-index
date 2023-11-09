const defaultTheme = require('tailwindcss/defaultTheme')
const colors = require('tailwindcss/colors')
const siteConfig = require('./config/site.config')

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      gray: colors.zinc,
      red: colors.rose,
      yellow: colors.amber,
      green: colors.green,
      blue: colors.sky,
      indigo: colors.indigo,
      purple: colors.purple,
      pink: colors.pink,
      teal: colors.teal,
      cyan: colors.cyan,
      orange: colors.orange,
    },
    extend: {
      fontFamily: {
        sans: [`"${siteConfig.googleFontSans}"`, '"Noto Sans SC"', ...defaultTheme.fontFamily.sans],
        mono: [`"${siteConfig.googleFontMono}"`, ...defaultTheme.fontFamily.mono]
      },
      colors: {
        gray: {
          850: '#222226'
        },
        new: '#53401c'
      },
      animation: {
        'spin-slow': 'spin 5s linear infinite',
        'new-flash': 'newFlash 2s ease-in-out',
      },
      keyframes: theme => ({
        newFlash: {
          '0%': { backgroundColor: theme('colors.new') },
          '100%': { backgroundColor: theme('colors.transparent') },
        },
      }),
    }
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}
