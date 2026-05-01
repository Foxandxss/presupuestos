import { expect, test } from '@playwright/test';

import { login } from '../utils/auth';

test.describe('Redirect 403 admin-only', () => {
  test('consultor que entra a /reportes/facturacion vuelve a /inicio con toast', async ({
    page,
  }) => {
    await login(page, 'consultor');

    await page.goto('/reportes/facturacion');

    await expect(page).toHaveURL(/\/inicio$/);
    await expect(page.getByText('No hay nada aquí.').first()).toBeVisible();
  });

  test('consultor no ve el grupo Reportes en el sidebar', async ({ page }) => {
    await login(page, 'consultor');
    await expect(page.getByRole('navigation').getByText('Reportes')).toHaveCount(0);
  });
});
