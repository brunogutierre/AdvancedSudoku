import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;

/**
 * End-to-end tests against the production build (`npm run e2e` builds it first), served under
 * the GitHub Pages base href so the service worker, the engine worker chunk and the puzzle
 * bank are loaded from their real paths.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/AdvancedSudoku/`,
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `tsx e2e/server.ts ${PORT}`,
    url: `http://localhost:${PORT}/AdvancedSudoku/`,
    reuseExistingServer: !process.env['CI'],
  },
});
