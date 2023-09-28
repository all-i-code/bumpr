module.exports = {
  collectCoverageFrom: ['src/**/*.js', '!src/typedefs.js', '!src/**/tests/*.js'],
  coverageThreshold: {
    global: {
      branches: 98,
      statements: 99,
    },
  },
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/tests/*.test.js'],
  transform: {
    '^.+\\.[t|j]sx?$': ['babel-jest', {plugins: ['babel-plugin-transform-import-meta']}],
  },
}
