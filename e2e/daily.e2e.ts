import { expect, test } from '@playwright/test';
import { savedGame, solve } from './support/game';

test("the daily page lists the week and today's puzzle can be played and solved", async ({
  page,
}) => {
  await page.goto('daily');
  const main = page.getByRole('main');
  const week = page.getByRole('navigation', { name: 'Week' });
  const days = week.getByRole('listitem').getByRole('button');
  await expect(days).toHaveCount(7);
  const today = week.locator('[aria-current="date"]');
  await expect(today).toHaveAccessibleName(/, today$/);
  await expect(today).toHaveAttribute('aria-pressed', 'true');
  await expect(week.getByRole('button', { name: 'Next week' })).toBeDisabled();

  const tier = (await main.locator('.day-card .chip').textContent())!.trim();
  await main.getByRole('link', { name: 'Play' }).click();
  await expect(page.getByRole('grid', { name: `Sudoku board, ${tier}` })).toBeVisible();
  const game = await savedGame(page);
  expect(game.mode).toBe('daily');

  await page.goto('daily');
  await main.getByRole('link', { name: 'Continue' }).click();
  await solve(page, game);
  await expect(page.getByRole('dialog', { name: 'Solved.' })).toBeVisible();

  await page.goto('daily');
  await expect(today).toHaveAccessibleName(/, solved$/);
  await expect(page.getByText('1-day streak')).toBeVisible();
  await expect(page.getByText(/^Solved in \d+:\d\d$/)).toBeVisible();
});
