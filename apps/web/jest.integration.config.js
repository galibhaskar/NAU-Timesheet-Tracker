/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  // Serialize all test files — they share a real DB; parallel runs corrupt each other's data
  maxWorkers: 1,
  // Give each test file its own timeout budget — DB calls are slower than unit tests
  testTimeout: 30000,
  // Env vars needed by route handlers and the JWT middleware
  testEnvironmentOptions: {
    env: {
      JWT_SECRET: 'test-jwt-secret-for-integration',
    },
  },
};
module.exports = config;
