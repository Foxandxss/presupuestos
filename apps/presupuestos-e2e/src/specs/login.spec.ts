import { expect, test } from '@playwright/test';

import { CREDENCIALES } from '../utils/credenciales';

test.describe('Login', () => {
  test('admin entra y ve los KPIs admin', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(CREDENCIALES.admin.email);
    await page.locator('#password').fill(CREDENCIALES.admin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/inicio$/);
    const kpis = page.getByLabel('Indicadores admin');
    await expect(kpis).toBeVisible();
    await expect(kpis.getByText('Pendientes de aprobación')).toBeVisible();
    await expect(kpis.getByText('Facturación del mes')).toBeVisible();
  });

  test('consultor entra y ve los KPIs consultor', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(CREDENCIALES.consultor.email);
    await page.locator('#password').fill(CREDENCIALES.consultor.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/inicio$/);
    const kpis = page.getByLabel('Indicadores consultor');
    await expect(kpis).toBeVisible();
    await expect(kpis.getByText('Mis horas consumidas')).toBeVisible();
    await expect(kpis.getByText('Líneas que cierran este mes')).toBeVisible();
    await expect(page.getByLabel('Indicadores admin')).toHaveCount(0);
  });

  test('credenciales inválidas muestran mensaje inline', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('admin@demo.com');
    await page.locator('#password').fill('contrasena-incorrecta');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(
      page.getByRole('alert').filter({ hasText: 'Email o contraseña inválidos.' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
