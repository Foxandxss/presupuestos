import { expect, test } from '@playwright/test';

import { login } from '../utils/auth';
import { elegirPrimeraOpcionPorAriaLabel } from '../utils/prime';

test.describe('Reportes - Facturacion CSV', () => {
  test('admin filtra y exporta CSV con cabeceras correctas', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/reportes/facturacion');

    await expect(page.getByRole('heading', { name: /Facturaci/i })).toBeVisible();
    // Espera a que el chart aparezca tras la primera carga.
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });

    // Aplica filtro de proveedor — chart se redibuja segun el effect.
    await elegirPrimeraOpcionPorAriaLabel(page, 'Filtrar por proveedor');
    // Da tiempo a que el effect dispare la nueva consulta.
    await page.waitForTimeout(500);
    await expect(page.locator('canvas').first()).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^facturacion.*\.csv$/);
    const path = await download.path();
    expect(path).not.toBeNull();
    const fs = await import('node:fs/promises');
    const contenido = await fs.readFile(path as string, 'utf8');

    const primeraLinea = contenido.split('\n')[0]?.trim();
    expect(primeraLinea).toBe('anio,mes,proveedorId,proveedor,totalEur');
  });
});
