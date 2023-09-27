module.exports = {
  collectCoverageFrom: ['src/**/*.js', '!src/typedefs.js', '!src/**/tests/*.js'],
  coverageThreshold: {
    global: {
      branches: 100,
      statements: 100,
    },
  },
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/tests/*.test.js'],
  transform: {
    '^.+\\.[t|j]sx?$': 'babel-jest',
  },
}
