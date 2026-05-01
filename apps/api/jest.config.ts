const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@operaciones/dominio$': '<rootDir>/../../libs/operaciones/dominio/index.ts',
    '^@operaciones/ui/charts$':
      '<rootDir>/../../libs/operaciones/ui/charts/index.ts',
    '^@operaciones/ui/command-palette$':
      '<rootDir>/../../libs/operaciones/ui/command-palette/index.ts',
    '^@operaciones/ui/errores$':
      '<rootDir>/../../libs/operaciones/ui/errores/index.ts',
    '^@operaciones/ui/estados-pedido$':
      '<rootDir>/../../libs/operaciones/ui/estados-pedido/index.ts',
    '^@operaciones/ui/iconos$':
      '<rootDir>/../../libs/operaciones/ui/iconos/index.ts',
    '^@operaciones/ui/kpis$':
      '<rootDir>/../../libs/operaciones/ui/kpis/index.ts',
    '^@operaciones/ui/listado$':
      '<rootDir>/../../libs/operaciones/ui/listado/index.ts',
    '^@operaciones/ui/shell$':
      '<rootDir>/../../libs/operaciones/ui/shell/index.ts',
    '^@operaciones/ui/tokens$':
      '<rootDir>/../../libs/operaciones/ui/tokens/index.ts',
  },
  coverageDirectory: 'test-output/jest/coverage',
};
