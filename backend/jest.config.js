module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src/', '<rootDir>/tests/'],  
    testMatch: ['**/*.test.ts'],
    transform: {
      '^.+\\.tsx?$': 'ts-jest'
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/types/**/*.ts',
      '!src/server.ts',
      '!**/node_modules/**'
    ],
    coverageThreshold: {
      global: {
        branches: 60,
        functions: 60,
        lines: 60,
        statements: 60
      }
    }
  };