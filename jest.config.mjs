export default {
  collectCoverageFrom: ['bin/**/*.mjs', 'src/**/*.mjs', '!src/typedefs.mjs', '!src/**/tests/*.mjs'],
  coverageThreshold: {
    global: {
      branches: 100,
      statements: 100
    }
  },
  moduleFileExtensions: ['js', 'mjs'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/tests/*.test.mjs'],
  transform: {}
}
