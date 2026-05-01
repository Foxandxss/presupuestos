const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'operaciones',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@operaciones/dominio$': '<rootDir>/dominio/index.ts',
    '^@operaciones/ui/errores$': '<rootDir>/ui/errores/index.ts',
  },
  coverageDirectory: 'test-output/jest/coverage',
};
