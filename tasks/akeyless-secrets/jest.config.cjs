module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/_tests_/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/coverage/'],
  verbose: false,
  silent: false
};
