import { expect, type Page } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha').fill('admin123');
  await page.getByRole('button', { name: 'Acessar' }).click();
  await expect(page).toHaveURL(/\/comanda/);
  await expect(page.getByRole('heading', { name: 'Comanda' })).toBeVisible();
}
