module.exports = {
  displayName: 'presupuestos',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
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
  moduleNameMapper: {
    '^@operaciones/dominio$': '<rootDir>/../../libs/operaciones/dominio/index.ts',
    '^@operaciones/ui/command-palette$':
      '<rootDir>/../../libs/operaciones/ui/command-palette/index.ts',
    '^@operaciones/ui/errores$':
      '<rootDir>/../../libs/operaciones/ui/errores/index.ts',
    '^@operaciones/ui/estados-pedido$':
      '<rootDir>/../../libs/operaciones/ui/estados-pedido/index.ts',
    '^@operaciones/ui/iconos$':
      '<rootDir>/../../libs/operaciones/ui/iconos/index.ts',
    '^@operaciones/ui/listado$':
      '<rootDir>/../../libs/operaciones/ui/listado/index.ts',
    '^@operaciones/ui/shell$':
      '<rootDir>/../../libs/operaciones/ui/shell/index.ts',
    '^@operaciones/ui/tokens$':
      '<rootDir>/../../libs/operaciones/ui/tokens/index.ts',
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
