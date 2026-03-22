/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Integration tests require a live database — run separately with test:integration
  testPathIgnorePatterns: ['/__tests__/integration/'],
};
module.exports = config;
