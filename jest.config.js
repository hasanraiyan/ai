module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@google/generative-ai|expo-file-system|expo-.*)/)',
  ],
  moduleFileExtensions: ['js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
  ],
};