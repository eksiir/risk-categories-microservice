module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  coverageThreshold: {
    'global': {
      branches: 97.5,
      functions: 97.5,
      lines: 97.5,
      statements: 97.5
    }
  }
};
