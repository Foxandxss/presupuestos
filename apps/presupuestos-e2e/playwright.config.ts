import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { E2E_DB_RELATIVE } from './global-setup';

const PORT_API = 3100;
const PORT_WEB = 4300;

const workspaceRoot = resolve(__dirname, '..', '..');
const dbAbsolute = resolve(workspaceRoot, E2E_DB_RELATIVE);

export default defineConfig({
  testDir: './src/specs',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: '.tmp/test-results',

  globalSetup: require.resolve('./global-setup'),

  use: {
    baseURL: `http://localhost:${PORT_WEB}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npx nx run api:serve --configuration=development',
      cwd: workspaceRoot,
      port: PORT_API,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        DATABASE_FILE: dbAbsolute,
        PORT: String(PORT_API),
        JWT_SECRET: 'presupuestos-e2e-secret',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npx nx run presupuestos:serve --port=${PORT_WEB} --host=127.0.0.1 --proxy-config=apps/presupuestos-e2e/proxy.conf.json`,
      cwd: workspaceRoot,
      port: PORT_WEB,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
