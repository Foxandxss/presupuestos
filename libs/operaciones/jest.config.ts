module.exports = {
  displayName: 'operaciones',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  testEnvironment: 'jsdom',
  coverageDirectory: 'test-output/jest/coverage',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@operaciones/dominio$': '<rootDir>/dominio/index.ts',
    '^@operaciones/ui/command-palette$':
      '<rootDir>/ui/command-palette/index.ts',
    '^@operaciones/ui/errores$': '<rootDir>/ui/errores/index.ts',
    '^@operaciones/ui/estados-pedido$':
      '<rootDir>/ui/estados-pedido/index.ts',
    '^@operaciones/ui/iconos$': '<rootDir>/ui/iconos/index.ts',
    '^@operaciones/ui/shell$': '<rootDir>/ui/shell/index.ts',
    '^@operaciones/ui/tokens$': '<rootDir>/ui/tokens/index.ts',
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
