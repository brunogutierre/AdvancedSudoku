import { expect, test } from '@playwright/test';
import { savedGame, solve } from './support/game';

test('a new Easy game from Home can be solved and counts in the stats', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'New Easy game' }).click();

  await expect(page).toHaveURL(/\/AdvancedSudoku\/play$/);
  const board = page.getByRole('grid', { name: 'Sudoku board, Easy' });
  await expect(board.getByRole('gridcell')).toHaveCount(81);
  await expect(board.getByRole('gridcell', { name: /given/ }).first()).toBeVisible();

  await solve(page, await savedGame(page));

  const dialog = page.getByRole('dialog', { name: 'Solved.' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Easy')).toBeVisible();
  await dialog.getByRole('link', { name: 'Home' }).click();

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Stats' }).click();
  await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();
  const kpi = (name: string) => page.locator('.kpi').filter({ hasText: name }).locator('dd');
  await expect(kpi('Games played')).toHaveText('1');
  await expect(kpi('Win rate')).toHaveText('100%');
  await expect(kpi('Best time')).not.toHaveText('–');
  await expect(
    page.getByRole('img', { name: /Solve times of the last 1 games won/ }),
  ).toBeVisible();
});
