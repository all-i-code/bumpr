module.exports = {
  extends: ['prettier-airbnb'],

  // globals for jest
  globals: {
    afterEach: false,
    beforeEach: false,
    describe: false,
    expect: false,
    it: false,
    jest: false,
  },

  parser: '@babel/eslint-parser',
  rules: {
    'arrow-parens': 'off', // conflicts with prettier
    'comma-dangle': ['error', 'only-multiline'], // conflicts with prettier
    'function-paren-newline': 'off', // conflicts with prettier
    'max-len': ['error', 120], // to match prettier settings
    'no-extra-semi': 'off', // conflicts with prettier
    'object-curly-spacing': ['error', 'never'], // to match prettier settings
    'object-curly-newline': 'off', // conflicts with prettier
    'operator-linebreak': 'off', // conflicts with prettier
    'semi-style': 'off', // conflicts with prettier
    semi: ['error', 'never'], // to match prettier settings
    'import/extensions': ['error', 'ignorePackages'],
  },
}
