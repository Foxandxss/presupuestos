import { expect, type Locator, test } from '@playwright/test';

import { login } from '../utils/auth';
import {
  elegirOpcionPorId,
  elegirPrimeraOpcionPorId,
} from '../utils/prime';

async function rellenarInputNumber(input: Locator, valor: string): Promise<void> {
  // p-inputNumber con currency formatea el valor (50,00 €). `fill()` se queda
  // como texto plano y el formControl queda null. Hay que centrarse en el
  // input nativo y emitir un Tab para que PrimeNG dispare el formato y empuje
  // el numero al control.
  await input.click();
  await input.press('Control+A');
  await input.press('Delete');
  await input.pressSequentially(valor);
  await input.press('Tab');
}

async function rellenarDatePicker(
  input: Locator,
  valorYyyyMmDd: string,
): Promise<void> {
  // p-datePicker con dateFormat=yy-mm-dd: tipear y `Enter` cierra el overlay
  // y commitea el formControl. `Escape` cancela.
  await input.click();
  await input.press('Control+A');
  await input.press('Delete');
  await input.pressSequentially(valorYyyyMmDd);
  await input.press('Enter');
}

test.describe('Ciclo de vida del Pedido', () => {
  test.setTimeout(180_000);

  test('admin crea, solicita, aprueba y consume un pedido completo', async ({ page }) => {
    await login(page, 'admin');

    await page.goto('/pedidos');
    await page.getByRole('button', { name: 'Nuevo pedido' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo pedido' });
    await expect(dialog).toBeVisible();

    await elegirPrimeraOpcionPorId(page, 'pedido-proyecto', dialog);
    await elegirPrimeraOpcionPorId(page, 'pedido-proveedor', dialog);

    // Linea 1: 5h del primer perfil. p-datePicker con dateFormat=yy-mm-dd
    // acepta yyyy-mm-dd directamente.
    const inicio1 = '2026-06-01';
    const fin1 = '2026-06-30';
    const inicio2 = '2026-07-01';
    const fin2 = '2026-07-31';

    await dialog.getByRole('button', { name: 'Añadir línea' }).click();
    await elegirPrimeraOpcionPorId(page, 'linea-perfil-0', dialog);
    await rellenarDatePicker(dialog.locator('#linea-inicio-0'), inicio1);
    await rellenarDatePicker(dialog.locator('#linea-fin-0'), fin1);
    await rellenarInputNumber(dialog.locator('#linea-horas-0'), '5');
    await rellenarInputNumber(dialog.locator('#linea-precio-0'), '50');

    await dialog.getByRole('button', { name: 'Añadir línea' }).click();
    await elegirPrimeraOpcionPorId(page, 'linea-perfil-1', dialog);
    await rellenarDatePicker(dialog.locator('#linea-inicio-1'), inicio2);
    await rellenarDatePicker(dialog.locator('#linea-fin-1'), fin2);
    await rellenarInputNumber(dialog.locator('#linea-horas-1'), '5');
    await rellenarInputNumber(dialog.locator('#linea-precio-1'), '50');

    await dialog.getByRole('button', { name: 'Guardar' }).click();

    await expect(page).toHaveURL(/\/pedidos\/\d+$/);

    // Estado inicial Borrador
    const cabecera = page.locator('.pre-detail__header');
    await expect(cabecera.getByText('Borrador').first()).toBeVisible();

    // Solicitar -> confirm -> Solicitado
    await page.getByRole('button', { name: 'Solicitar' }).click();
    await page.getByRole('button', { name: 'Solicitar', exact: true }).last().click();
    await expect(cabecera.getByText('Solicitado').first()).toBeVisible({ timeout: 15_000 });

    // Aprobar -> confirm -> Aprobado
    await page.getByRole('button', { name: 'Aprobar' }).click();
    await page.getByRole('button', { name: 'Aprobar', exact: true }).last().click();
    await expect(cabecera.getByText('Aprobado').first()).toBeVisible({ timeout: 15_000 });

    // Consumo de la primera linea (5h junio 2026) -> EnEjecucion
    await page.getByRole('button', { name: 'Registrar consumo' }).click();
    const drawer = page.getByRole('dialog', { name: 'Registrar consumo' });
    await expect(drawer).toBeVisible();

    // Primer consumo cubre la linea 1 entera (5h) en junio 2026.
    await drawer.locator('#drawer-linea').click();
    await page.locator('.p-select-overlay').getByRole('option').nth(0).click();
    await elegirPrimeraOpcionPorId(page, 'drawer-recurso', drawer);
    await elegirOpcionPorId(page, 'drawer-mes', '06 — Junio', drawer);
    await rellenarInputNumber(drawer.locator('#drawer-anio'), '2026');
    await rellenarInputNumber(drawer.locator('#drawer-horas'), '5');
    await drawer.getByRole('button', { name: 'Registrar y nuevo' }).click();

    // Tras el registro OK, mes/horas se reinician.
    await expect(drawer.locator('#drawer-horas')).toHaveValue('');

    // Segundo consumo: linea 2 (la que queda) 5h julio 2026 -> auto-Consumido.
    await drawer.locator('#drawer-linea').click();
    await page.locator('.p-select-overlay').getByRole('option').nth(1).click();
    await elegirPrimeraOpcionPorId(page, 'drawer-recurso', drawer);
    await elegirOpcionPorId(page, 'drawer-mes', '07 — Julio', drawer);
    await rellenarInputNumber(drawer.locator('#drawer-anio'), '2026');
    await rellenarInputNumber(drawer.locator('#drawer-horas'), '5');
    await drawer.getByRole('button', { name: 'Registrar y nuevo' }).click();

    // Cierra el drawer manualmente para volver al detail.
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();

    await expect(cabecera.getByText('Consumido').first()).toBeVisible({ timeout: 15_000 });
  });
});
