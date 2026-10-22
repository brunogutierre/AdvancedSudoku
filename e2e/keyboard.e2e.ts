import { expect, test } from '@playwright/test';
import { cell, openBoard, seedGame } from './support/game';

// R1C3 (index 2) and R1C4 (index 3) are empty in the seeded puzzle; R1C1 is a given 5.
test.beforeEach(async ({ page }) => {
  await seedGame(page);
  await openBoard(page);
});

test('plays with the keyboard: digits, notes, undo/redo and erase', async ({ page }) => {
  const r1c3 = cell(page, 2);
  const r1c4 = cell(page, 3);

  await r1c3.click();
  await page.keyboard.press('Digit4');
  await expect(r1c3).toHaveAccessibleName('Row 1, column 3, box 1, 4');

  await page.keyboard.press('ArrowRight');
  await expect(r1c4).toBeFocused();
  await expect(r1c4).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Shift+Digit6');
  await page.keyboard.press('KeyN');
  await expect(page.getByRole('button', { name: /Notes/ })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Digit1');
  await page.keyboard.press('KeyN');
  await expect(r1c4).toHaveAccessibleName('Row 1, column 4, box 2, empty, notes 1 6');

  await page.keyboard.press('Control+KeyZ');
  await expect(r1c4).toHaveAccessibleName('Row 1, column 4, box 2, empty, notes 6');
  await page.keyboard.press('Control+KeyY');
  await expect(r1c4).toHaveAccessibleName('Row 1, column 4, box 2, empty, notes 1 6');

  await page.keyboard.press('Backspace');
  await expect(r1c4).toHaveAccessibleName('Row 1, column 4, box 2, empty');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Delete');
  await expect(r1c3).toHaveAccessibleName('Row 1, column 3, box 1, empty');
});

test('flags a digit that breaks the rules', async ({ page }) => {
  const r1c4 = cell(page, 3);
  await r1c4.click();
  await page.keyboard.press('Digit5');

  await expect(r1c4).toHaveAttribute('aria-invalid', 'true');
  await expect(r1c4).toHaveAccessibleName('Row 1, column 4, box 2, 5, conflict');
  await page.keyboard.press('Digit6');
  await expect(r1c4).not.toHaveAttribute('aria-invalid');
});

test('pausing hides every digit and resuming brings them back', async ({ page }) => {
  const digits = page.locator('app-board .digit');
  await expect(digits).not.toHaveCount(0);

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('timer')).toHaveText('Paused');
  await expect(digits).toHaveCount(0);
  await expect(cell(page, 0)).not.toHaveAttribute('aria-label');

  await page.getByRole('button', { name: 'Resume' }).first().click();
  await expect(digits).not.toHaveCount(0);
  await expect(cell(page, 0)).toHaveAccessibleName('Row 1, column 1, box 1, given 5');
});
