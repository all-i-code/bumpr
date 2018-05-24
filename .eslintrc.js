module.exports = {
  extends: ['prettier-airbnb'],
  rules: {
    'no-extra-semi': 'off', // conflicts with prettier
    'semi-style': 'off', // conflicts with prettier
    'max-len': 'off' // conflicts with prettier
  }
}
