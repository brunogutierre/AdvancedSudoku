import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslocoTesting } from '../../../testing/i18n';
import completionEn from '../../../../public/i18n/completion/en.json';
import playEn from '../../../../public/i18n/play/en.json';
import hintsEn from '../../../../public/i18n/hints/en.json';
import { ToastService } from '../../core/toast/toast.service';
import type { Step } from '../../engine';
import { APP_STORAGE, GameStore, StatsStore } from '../../core';
import type { GameState } from '../../core';
import { MemoryStorage } from '../../core/testing/memory-storage';
import type { GeneratedPuzzle } from '../../engine';
import { KNOWN_PUZZLES } from '../../engine/testing/fixtures';
import { EngineClient } from '../../engine-worker/engine-client';
import { GAME_WON_HANDLERS } from './game-events';
import { Play } from './play';

@Component({ template: '' })
class Blank {}

const wiki = KNOWN_PUZZLES[0];
const generated: GeneratedPuzzle = {
  puzzle: wiki.puzzle,
  solution: wiki.solution,
  tier: 'medium',
  seed: 'seed',
};
/** Only R1C3 (solution 4) is empty. */
const almostSolved: GeneratedPuzzle = {
  ...generated,
  puzzle: wiki.solution.slice(0, 2) + '.' + wiki.solution.slice(3),
};

/** R1C3 must be 4 in the Wikipedia puzzle. */
const hiddenSingle: Step = {
  technique: 'hiddenSingle',
  placements: [{ cell: 2, digit: 4 }],
  eliminations: [],
  highlights: { cells: [2], units: [{ type: 'row', index: 0 }], digits: [4] },
  explainKey: 'technique.hiddenSingle.explain',
  params: { cell: 'R1C3', digit: 4, unit: 'row', unitIndex: 1 },
};

describe('Play', () => {
  let generate: ReturnType<typeof vi.fn>;
  let onWon: ReturnType<typeof vi.fn>;
  let hint: ReturnType<typeof vi.fn>;
  let daily: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    generate = vi.fn().mockResolvedValue(generated);
    onWon = vi.fn();
    hint = vi.fn().mockResolvedValue(hiddenSingle);
    daily = vi.fn().mockResolvedValue({ ...generated, tier: 'hard', seed: 'daily:v1:2026-10-21' });
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoTesting({
          'play/en': playEn,
          'hints/en': hintsEn,
          'completion/en': completionEn,
        }),
        provideRouter(
          [
            { path: 'play', component: Play },
            { path: '**', component: Blank },
          ],
          withComponentInputBinding(),
        ),
        { provide: APP_STORAGE, useValue: new MemoryStorage() },
        { provide: EngineClient, useValue: { generate, hint, daily } },
        { provide: GAME_WON_HANDLERS, useValue: onWon, multi: true },
      ],
    });
  });

  async function open(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    const store = TestBed.inject(GameStore);
    const press = async (init: KeyboardEventInit, target: EventTarget = document.body) => {
      target.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
      );
      await harness.fixture.whenStable();
    };
    return { harness, root, store, press };
  }

  it('starts the requested difficulty, then drops the query param', async () => {
    let resolve!: (p: GeneratedPuzzle) => void;
    generate.mockReturnValue(new Promise((r) => (resolve = r)));
    const harness = await RouterTestingHarness.create();
    void harness.navigateByUrl('/play?difficulty=hard');
    await new Promise((r) => setTimeout(r));
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('.skeleton')?.textContent).toContain('Generating a unique puzzle');
    expect(generate).toHaveBeenCalledWith('hard');

    resolve(generated);
    await harness.fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    harness.detectChanges();
    expect(root.querySelectorAll('[role=gridcell]').length).toBe(81);
    expect(root.querySelector('[role=grid]')?.getAttribute('aria-label')).toBe(
      'Sudoku board, Medium',
    );
    expect(TestBed.inject(GameStore).status()).toBe('playing');
    expect(TestBed.inject(Router).url).toBe('/play');
  });

  it('resumes a saved game instead of generating', async () => {
    const store = TestBed.inject(GameStore);
    store.newGame({ puzzle: wiki.puzzle, solution: wiki.solution, difficulty: 'hard' });
    store.pause();
    await open('/play');
    expect(generate).not.toHaveBeenCalled();
    expect(store.status()).toBe('playing');
  });

  it('starts an easy game when there is nothing to resume', async () => {
    await open('/play');
    expect(generate).toHaveBeenCalledWith('easy');
  });

  it('offers a retry when generation fails', async () => {
    generate.mockRejectedValueOnce(new Error('boom'));
    const { harness, root } = await open('/play?difficulty=easy');
    expect(root.querySelector('[role=alert]')?.textContent).toContain("Couldn't create a puzzle.");

    root.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(generate).toHaveBeenCalledTimes(2);
    expect(root.querySelector('[role=grid]')).not.toBeNull();
  });

  it('plays with the keyboard: move, digits, notes, erase, undo and redo', async () => {
    const { store, press } = await open('/play?difficulty=medium');
    await press({ key: 'ArrowRight' });
    expect(store.selected()).toBe(0);
    await press({ key: 'ArrowRight' });
    expect(store.selected()).toBe(1);
    expect((document.activeElement as HTMLElement).dataset['index']).toBe('1');
    await press({ key: 'ArrowRight' });

    await press({ code: 'Digit4', key: '4' });
    expect(store.cells()[2].value).toBe(4);
    await press({ code: 'KeyZ', key: 'z', ctrlKey: true });
    expect(store.cells()[2].value).toBe(0);
    await press({ code: 'KeyY', key: 'y', ctrlKey: true });
    expect(store.cells()[2].value).toBe(4);
    await press({ key: 'Backspace' });
    expect(store.cells()[2].value).toBe(0);

    await press({ code: 'Digit1', key: '!', shiftKey: true });
    expect(store.cells()[2].notes).toBe(0b1);
    await press({ code: 'KeyN', key: 'n' });
    expect(store.notesMode()).toBe(true);
    await press({ code: 'Digit2', key: '2' });
    expect(store.cells()[2].notes).toBe(0b11);
    await press({ code: 'KeyQ', key: 'q' });
  });

  it('pauses with P or Esc, hides the digits and resumes', async () => {
    const { harness, root, store, press } = await open('/play?difficulty=medium');
    await press({ key: 'Escape' });
    harness.detectChanges();
    expect(store.status()).toBe('paused');
    expect(root.querySelector('.digit')).toBeNull();
    expect(root.querySelector('.timer')?.textContent?.trim()).toBe('Paused');

    await press({ key: 'Escape' });
    expect(store.status()).toBe('paused');
    await press({ code: 'Digit4', key: '4' });
    expect(store.status()).toBe('paused');

    root.querySelector<HTMLButtonElement>('.resume')!.click();
    expect(store.status()).toBe('playing');
    await press({ code: 'KeyP', key: 'p' });
    expect(store.status()).toBe('paused');
    await press({ code: 'KeyP', key: 'p' });
    expect(store.status()).toBe('playing');
  });

  it('uses the pad and action bar, and ignores keys typed in menus', async () => {
    const { harness, root, store, press } = await open('/play?difficulty=medium');
    store.select(2);
    harness.detectChanges();
    root.querySelector<HTMLButtonElement>('app-number-pad [data-digit="4"]')!.click();
    expect(store.cells()[2].value).toBe(4);
    harness.detectChanges();

    const [undo, redo, erase, notes] = Array.from(
      root.querySelectorAll<HTMLButtonElement>('app-action-bar button'),
    );
    undo.click();
    expect(store.cells()[2].value).toBe(0);
    harness.detectChanges();
    redo.click();
    erase.click();
    expect(store.cells()[2].value).toBe(0);
    notes.click();
    expect(store.notesMode()).toBe(true);

    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.append(menu);
    await press({ code: 'KeyN', key: 'n' }, menu);
    expect(store.notesMode()).toBe(true);
    menu.remove();
  });

  it('shows the win state, runs completion hooks once and starts a new game', async () => {
    generate.mockResolvedValueOnce(almostSolved);
    const { harness, root, store, press } = await open('/play?difficulty=medium');
    store.select(2);
    await press({ code: 'Digit4', key: '4' });
    harness.detectChanges();

    expect(store.isWon()).toBe(true);
    expect(onWon).toHaveBeenCalledOnce();
    expect(root.querySelector('app-completion')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('app-completion .actions button')!.click();
    await harness.fixture.whenStable();
    expect(generate).toHaveBeenLastCalledWith('medium');
    expect(store.status()).toBe('playing');
  });

  it('compares with the previous best before the win is recorded', async () => {
    const stats = TestBed.inject(StatsStore);
    const store = TestBed.inject(GameStore);
    stats.recordWin({ ...store.state(), difficulty: 'medium', elapsedMs: 3_600_000 });
    onWon.mockImplementation((game: GameState) => stats.recordWin(game));
    generate.mockResolvedValueOnce(almostSolved);
    const { harness, root, press } = await open('/play?difficulty=medium');
    store.select(2);
    await press({ code: 'Digit4', key: '4' });
    harness.detectChanges();
    expect(root.querySelector('app-completion .badge')?.textContent).toContain('New best');
    expect(stats.data().perDifficulty.medium.won).toBe(2);
  });

  it('opens the radial picker with Space, right-click, and fills candidates with A', async () => {
    const { harness, root, store, press } = await open('/play?difficulty=medium');
    store.select(2);
    await press({ key: ' ', code: 'Space' });
    harness.detectChanges();
    expect(root.querySelector('app-radial-picker')).not.toBeNull();
    expect(root.querySelector('.stage')?.classList).toContain('dimmed');

    const picker = root.querySelector('app-radial-picker')!;
    picker.querySelector<HTMLButtonElement>('[data-digit="4"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(store.cells()[2].value).toBe(4);
    expect(root.querySelector('app-radial-picker')).toBeNull();
    expect((document.activeElement as HTMLElement).dataset['index']).toBe('2');

    root
      .querySelector('[data-index="3"]')!
      .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    harness.detectChanges();
    expect(store.selected()).toBe(3);
    expect(root.querySelector('app-radial-picker')).not.toBeNull();

    await press({ code: 'KeyA', key: 'a' });
    expect(store.cells()[3].notes).not.toBe(0);
  });

  it('keeps Space for focused buttons outside the board', async () => {
    const { harness, root, store, press } = await open('/play?difficulty=medium');
    store.select(2);
    const key = root.querySelector<HTMLButtonElement>('app-number-pad button')!;
    await press({ key: ' ', code: 'Space' }, key);
    harness.detectChanges();
    expect(root.querySelector('app-radial-picker')).toBeNull();
  });

  it('runs the Konami combo once while playing', async () => {
    const { harness, root, store } = await open('/play?difficulty=medium');
    const keys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    for (const key of [...keys, 'ArrowLeft', 'ArrowRight', 'b', 'a']) {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    }
    harness.detectChanges();
    expect(root.querySelector('app-combo-banner')).not.toBeNull();
    expect(store.state().assisted).toBe(true);
  });

  it('pauses the game when leaving the screen', async () => {
    const { harness, store } = await open('/play?difficulty=medium');
    await harness.navigateByUrl('/');
    expect(store.status()).toBe('paused');
  });

  describe('daily', () => {
    it('starts the daily puzzle of a date and records the start', async () => {
      const { store } = await open('/play?daily=2026-10-21');
      expect(daily).toHaveBeenCalledWith('2026-10-21');
      expect(generate).not.toHaveBeenCalled();
      expect(store.state()).toMatchObject({
        mode: 'daily',
        dailyDate: '2026-10-21',
        difficulty: 'hard',
        status: 'playing',
      });
      expect(TestBed.inject(StatsStore).data().perDifficulty.hard.started).toBe(1);
      expect(TestBed.inject(Router).url).toBe('/play');
    });

    it("resumes today's unfinished daily instead of regenerating it", async () => {
      const store = TestBed.inject(GameStore);
      store.newGame({ ...generated, difficulty: 'hard', mode: 'daily', dailyDate: '2026-10-21' });
      store.pause();
      await open('/play?daily=2026-10-21');
      expect(daily).not.toHaveBeenCalled();
      expect(store.status()).toBe('playing');
      expect(TestBed.inject(Router).url).toBe('/play');
    });

    it('retries a failed daily as a daily', async () => {
      daily.mockRejectedValueOnce(new Error('boom'));
      const { harness, root } = await open('/play?daily=2026-10-21');
      root.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
      await harness.fixture.whenStable();
      expect(daily).toHaveBeenCalledTimes(2);
      expect(generate).not.toHaveBeenCalled();
    });
  });

  describe('hints', () => {
    it('opens with the action bar, shows the step on the board and applies it', async () => {
      const { harness, root, store } = await open('/play?difficulty=medium');
      const hintButton = root.querySelectorAll<HTMLButtonElement>('app-action-bar button')[4];
      expect(hintButton.disabled).toBe(false);
      hintButton.click();
      await harness.fixture.whenStable();
      harness.detectChanges();

      const { values, solution } = store.state();
      expect(hint).toHaveBeenCalledWith(values, expect.objectContaining({ solution }));
      const panel = root.querySelector('app-hint-panel')!;
      expect(panel.querySelector('.explain')?.textContent).toBe(
        '4 fits in only one cell in row 1: R1C3.',
      );
      expect(root.querySelector('[data-index="2"] .ghost')?.textContent).toBe('4');
      expect(root.querySelector('.hint-unit')).not.toBeNull();

      panel.querySelectorAll<HTMLButtonElement>('footer button')[1].click();
      harness.detectChanges();
      expect(store.cells()[2].value).toBe(4);
      expect(store.hintsUsed()).toBe(1);
      expect(root.querySelector('app-hint-panel')).toBeNull();
      expect(root.querySelector('.ghost')).toBeNull();
    });

    it('opens with H, closes with Esc without pausing, and closes when the board changes', async () => {
      const { harness, root, store, press } = await open('/play?difficulty=medium');
      await press({ code: 'KeyH', key: 'h' });
      harness.detectChanges();
      expect(root.querySelector('app-hint-panel')).not.toBeNull();
      await press({ key: 'Escape' });
      harness.detectChanges();
      expect(root.querySelector('app-hint-panel')).toBeNull();
      expect(store.status()).toBe('playing');

      await press({ code: 'KeyH', key: 'h' });
      harness.detectChanges();
      store.select(2);
      await press({ code: 'Digit4', key: '4' });
      harness.detectChanges();
      expect(root.querySelector('app-hint-panel')).toBeNull();
    });

    it('ignores a hint that arrives after the panel was closed', async () => {
      let resolve!: (step: Step) => void;
      hint.mockReturnValue(new Promise((r) => (resolve = r)));
      const { harness, root, press } = await open('/play?difficulty=medium');
      await press({ code: 'KeyH', key: 'h' });
      harness.detectChanges();
      expect(root.querySelector('app-hint-panel [role=status]')).not.toBeNull();
      root.querySelector<HTMLButtonElement>('app-hint-panel .close')!.click();
      resolve(hiddenSingle);
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(root.querySelector('app-hint-panel')).toBeNull();
    });

    it('tells the player when there is no hint or the engine fails', async () => {
      hint.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('boom'));
      const { harness, root, press } = await open('/play?difficulty=medium');
      const toasts = TestBed.inject(ToastService);
      await press({ code: 'KeyH', key: 'h' });
      expect(toasts.toasts().at(-1)?.message).toContain('No hint available');
      await press({ code: 'KeyH', key: 'h' });
      await harness.fixture.whenStable();
      expect(toasts.toasts().at(-1)?.message).toBe("Couldn't compute a hint. Try again.");
      harness.detectChanges();
      expect(root.querySelector('app-hint-panel')).toBeNull();
    });

    it('is disabled while paused', async () => {
      const { harness, root, store, press } = await open('/play?difficulty=medium');
      store.pause();
      harness.detectChanges();
      expect(root.querySelectorAll<HTMLButtonElement>('app-action-bar button')[4].disabled).toBe(
        true,
      );
      await press({ code: 'KeyH', key: 'h' });
      expect(hint).not.toHaveBeenCalled();
    });
  });
});
