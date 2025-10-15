module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    }],
    '^.+\\.js$': ['babel-jest', {
      presets: [['@babel/preset-env', {
        targets: { node: 'current' },
        modules: false
      }]],
      plugins: [
        ['@babel/plugin-syntax-import-meta']
      ]
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(supertest)/)'
  ],
  testMatch: ['**/__tests__/**/*.test.(js|ts)', '**/?(*.)+(spec|test).(js|ts)'],
  collectCoverageFrom: [
    'src/**/*.(js|ts)',
    '!src/server.js',
    '!src/database/**/*.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};