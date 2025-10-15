export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js', '**/__tests__/**/*.test.jsx', '**/?(*.)+(spec|test).jsx'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/setupTests.js'
  ]
};