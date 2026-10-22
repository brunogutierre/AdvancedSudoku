import { expect, test } from '@playwright/test';
import { blank, cell, openBoard, PUZZLE, seedGame, SOLUTION } from './support/game';

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
];

test('a hint explains the next step and Apply plays it', async ({ page }) => {
  // Only R1C3 and R9C9 are left: each is the last empty cell of its row.
  await seedGame(page, blank(SOLUTION, [2, 80]));
  const board = await openBoard(page);
  const empty = board.getByRole('gridcell', { name: /empty/ });
  await expect(empty).toHaveCount(2);

  await page.getByRole('button', { name: 'Hint' }).click();
  const panel = page.locator('app-hint-panel');
  await expect(panel.getByRole('heading', { name: 'Full House' })).toBeVisible();
  await expect(
    panel.getByText(/is the last empty cell in (row|column|box) \d, so it must be \d/),
  ).toBeVisible();
  await expect(board.locator('.hint-place')).toHaveCount(1);

  await panel.getByRole('button', { name: 'Apply' }).click();
  await expect(panel).toBeHidden();
  await expect(empty).toHaveCount(1);
});

test('the radial picker opens with Space or right-click and places a digit', async ({ page }) => {
  await seedGame(page);
  await openBoard(page);
  const picker = page.getByRole('menu');

  await cell(page, 2).click();
  await page.keyboard.press('Space');
  await expect(picker).toBeVisible();
  await picker.getByRole('menuitemradio', { name: '4', exact: true }).click();
  await expect(picker).toBeHidden();
  await expect(cell(page, 2)).toHaveAccessibleName('Row 1, column 3, box 1, 4');

  await cell(page, 3).click({ button: 'right' });
  await expect(picker).toBeVisible();
  await page.keyboard.press('Digit6');
  await expect(picker).toBeHidden();
  await expect(cell(page, 3)).toHaveAccessibleName('Row 1, column 4, box 2, 6');
  await expect(cell(page, 3)).toBeFocused();
});

test('the Konami code shows the combo banner and fills the singles', async ({ page }) => {
  await seedGame(page);
  const board = await openBoard(page);
  const givens = [...PUZZLE].filter((d) => d !== '0').length;
  await expect(board.locator('.digit')).toHaveCount(givens);

  await cell(page, 40).focus();
  for (const key of KONAMI) {
    await page.keyboard.press(key);
  }

  await expect(page.getByRole('status', { name: 'COMBO BREAKER!!' })).toBeVisible();
  await expect.poll(() => board.locator('.digit').count()).toBeGreaterThan(givens);
});
