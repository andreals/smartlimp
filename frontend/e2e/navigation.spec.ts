import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers';

async function expandCadastro(page: Page) {
  const btn = page.getByRole('button', { name: 'Cadastro' });
  if ((await btn.getAttribute('aria-expanded')) !== 'true') {
    await btn.click();
  }
}

test.describe('Navegação autenticada', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('acessa páginas principais pelo menu', async ({ page }) => {
    await page.getByRole('link', { name: 'Gestão' }).click();
    await expect(page).toHaveURL(/\/gestao/);

    await page.getByRole('link', { name: 'Financeiro' }).click();
    await expect(page).toHaveURL(/\/financeiro/);

    await page.getByRole('link', { name: 'Comanda' }).click();
    await expect(page).toHaveURL(/\/comanda/);
  });

  test('acessa cadastros pelo menu', async ({ page }) => {
    await expandCadastro(page);

    await page.getByRole('link', { name: 'Clientes' }).click();
    await expect(page).toHaveURL(/\/clientes/);

    await page.getByRole('link', { name: 'Pacotes' }).click();
    await expect(page).toHaveURL(/\/pacotes/);

    await page.getByRole('link', { name: 'Peças' }).click();
    await expect(page).toHaveURL(/\/pecas/);

    await page.getByRole('link', { name: 'Usuários' }).click();
    await expect(page).toHaveURL(/\/usuarios/);
  });
});
