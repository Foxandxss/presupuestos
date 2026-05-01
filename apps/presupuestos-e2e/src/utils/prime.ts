import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Abre el desplegable de un PrimeNG <p-select> identificado por inputId
 * (que se renderiza como id="<inputId>" sobre el combobox), elige la opcion
 * matching y espera a que el overlay cierre.
 */
export async function elegirOpcionPorId(
  page: Page,
  inputId: string,
  opcionNombre: string | RegExp,
  scope: Page | Locator = page,
): Promise<void> {
  await scope.locator(`#${inputId}`).click();
  const overlay = page.locator('.p-select-overlay');
  await expect(overlay).toBeVisible();
  await page.getByRole('option', { name: opcionNombre }).first().click();
  await expect(overlay).toBeHidden();
}

/**
 * Igual que elegirOpcionPorId pero elige la primera opcion disponible.
 * Util cuando el seed no expone nombres deterministas.
 */
export async function elegirPrimeraOpcionPorId(
  page: Page,
  inputId: string,
  scope: Page | Locator = page,
): Promise<string> {
  await scope.locator(`#${inputId}`).click();
  const overlay = page.locator('.p-select-overlay').first();
  await expect(overlay).toBeVisible();
  const primera = overlay.getByRole('option').first();
  const texto = (await primera.textContent())?.trim() ?? '';
  await primera.click();
  await expect(page.locator('.p-select-overlay')).toBeHidden();
  return texto;
}

/**
 * Cuando el combobox se identifica por aria-label (toolbar de filtros con
 * ariaLabel="Filtrar por proveedor", etc).
 */
export async function elegirOpcionPorAriaLabel(
  page: Page,
  ariaLabel: string,
  opcionNombre: string | RegExp,
): Promise<void> {
  await page.getByRole('combobox', { name: ariaLabel, exact: true }).click();
  const overlay = page.locator('.p-select-overlay');
  await expect(overlay).toBeVisible();
  await page.getByRole('option', { name: opcionNombre }).first().click();
  await expect(overlay).toBeHidden();
}

export async function elegirPrimeraOpcionPorAriaLabel(
  page: Page,
  ariaLabel: string,
): Promise<string> {
  await page.getByRole('combobox', { name: ariaLabel, exact: true }).click();
  const overlay = page.locator('.p-select-overlay').first();
  await expect(overlay).toBeVisible();
  const primera = overlay.getByRole('option').first();
  const texto = (await primera.textContent())?.trim() ?? '';
  await primera.click();
  await expect(page.locator('.p-select-overlay')).toBeHidden();
  return texto;
}
