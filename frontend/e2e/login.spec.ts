import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Autenticação', () => {
  test('redireciona rota protegida para login', async ({ page }) => {
    await page.goto('/comanda');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Smart Limp' })).toBeVisible();
  });

  test('login com admin acessa comanda', async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('credenciais inválidas exibem erro', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Login').fill('admin');
    await page.getByLabel('Senha').fill('senha-errada');
    await page.getByRole('button', { name: 'Acessar' }).click();
    await expect(page.getByText(/senha|login|incorret/i)).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
