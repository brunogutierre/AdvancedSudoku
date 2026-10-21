import { expect, test } from '@playwright/test';

test('language and theme changes apply at once and survive a reload', async ({ page }) => {
  await page.goto('settings');
  const html = page.locator('html');

  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR');
  await expect(html).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Configurações');

  const theme = page.getByRole('radiogroup', { name: 'Tema' });
  await theme.getByRole('radio', { name: 'Escuro' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('color-scheme', 'dark');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Configurações');

  await theme.getByRole('radio', { name: 'Claro' }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
});
