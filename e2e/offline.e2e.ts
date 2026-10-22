import { expect, test } from '@playwright/test';

test('after the first visit the app works offline, deep links included', async ({
  page,
  context,
}) => {
  await page.goto('./');
  // Angular's service worker prefetches the "app" asset group after it takes control; going
  // offline is only safe once every URL of that group (listed in ngsw.json) is cached.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          if (!navigator.serviceWorker.controller) return false;
          const manifest = await (await fetch('ngsw.json?ngsw-cache-bust=e2e')).json();
          const app = manifest.assetGroups.find((g: { name: string }) => g.name === 'app');
          const cacheName = (await caches.keys()).find((n) => n.endsWith(':assets:app:cache'));
          const cached = cacheName ? await (await caches.open(cacheName)).keys() : [];
          return cached.length >= app.urls.length;
        }),
      { timeout: 20_000 },
    )
    .toBe(true);

  await context.setOffline(true);
  await page.goto('play?difficulty=easy');
  const board = page.getByRole('grid', { name: 'Sudoku board, Easy' });
  await expect(board.getByRole('gridcell')).toHaveCount(81);

  await page.reload();
  await expect(board.getByRole('gridcell')).toHaveCount(81);
  await expect(page).toHaveTitle('Play · Advanced Sudoku');
});
