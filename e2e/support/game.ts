import { expect, type Page } from '@playwright/test';

/** Same key and shape as the app's PersistedGame (src/app/core/game/persisted-game.ts). */
export const GAME_KEY = 'advsudoku:v1:game';

export interface SavedGame {
  readonly puzzle: string;
  readonly solution: string;
  readonly values: string;
  readonly status: string;
  readonly mode: string;
  readonly dailyDate: string | null;
}

/** Wikipedia's example puzzle: R1C3 must be 4 and R1C4 must be 6. */
export const PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
export const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

/** `values` with the listed cells emptied. */
export function blank(values: string, cells: readonly number[]): string {
  return [...values].map((digit, i) => (cells.includes(i) ? '0' : digit)).join('');
}

/**
 * Stores a paused game before the app boots, so `/play` resumes a known position instead of
 * generating a random puzzle. Written only once per test (the guard keeps reloads intact).
 */
export async function seedGame(page: Page, values = PUZZLE): Promise<void> {
  const game = {
    puzzle: PUZZLE,
    solution: SOLUTION,
    values,
    notes: Array<number>(81).fill(0),
    selected: null,
    notesMode: false,
    difficulty: 'easy',
    mode: 'classic',
    dailyDate: null,
    seed: null,
    elapsedMs: 0,
    status: 'paused',
    mistakes: 0,
    hintsUsed: 0,
    assisted: false,
  };
  await page.addInitScript(
    ([key, value]) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    [GAME_KEY, JSON.stringify(game)] as const,
  );
}

/** Opens the Play page and waits for the board. */
export async function openBoard(page: Page) {
  await page.goto('play');
  const board = page.getByRole('grid', { name: /Sudoku board/ });
  await expect(board.getByRole('gridcell')).toHaveCount(81);
  return board;
}

/** The cell at a 0-based index. */
export function cell(page: Page, index: number) {
  return page.locator(`[role="gridcell"][data-index="${index}"]`);
}

/** The game the app autosaved (debounced), once it is being played. */
export async function savedGame(page: Page): Promise<SavedGame> {
  let saved: SavedGame | null = null;
  await expect
    .poll(async () => {
      const raw = await page.evaluate((key) => localStorage.getItem(key), GAME_KEY);
      saved = raw ? (JSON.parse(raw) as SavedGame) : null;
      return saved?.status;
    })
    .toBe('playing');
  return saved!;
}

/** Types the solution into every empty cell, the way a player would. */
export async function solve(page: Page, game: Pick<SavedGame, 'puzzle' | 'solution'>) {
  for (let i = 0; i < 81; i++) {
    if (game.puzzle[i] !== '.' && game.puzzle[i] !== '0') continue;
    await cell(page, i).click();
    await page.keyboard.press(`Digit${game.solution[i]}`);
  }
}
