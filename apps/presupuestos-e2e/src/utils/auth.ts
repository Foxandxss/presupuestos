import { expect, type Page } from '@playwright/test';

import { CREDENCIALES, type RolDemo } from './credenciales';

export async function login(page: Page, rol: RolDemo): Promise<void> {
  const { email, password } = CREDENCIALES[rol];
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}
