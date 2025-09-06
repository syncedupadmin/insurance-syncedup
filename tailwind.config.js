module.exports = {
  content: [
    './public/*.html',
    './public/**/*.html',
    './public/*.js',
    './public/**/*.js',
    '!./public/node_modules/**'
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
