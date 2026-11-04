import { expect, test } from '@playwright/test';

test('a banner links to the Android app, and stays closed once closed', async ({ page }) => {
  await page.goto('./');
  const banner = page.getByRole('complementary', { name: 'About the Android app' });
  await expect(banner).toContainText('Advanced Sudoku is now an Android app.');
  await expect(banner.getByRole('link', { name: 'See the app' })).toHaveAttribute(
    'href',
    'https://altcozygames.com/en/sudoku',
  );

  await banner.getByRole('button', { name: 'Close' }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.locator('main h1')).toBeVisible();
  await expect(banner).toBeHidden();
});
