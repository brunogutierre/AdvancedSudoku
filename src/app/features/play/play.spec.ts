import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslocoTesting } from '../../../testing/i18n';
import playEn from '../../../../public/i18n/play/en.json';
import { APP_STORAGE, GameStore } from '../../core';
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

describe('Play', () => {
  let generate: ReturnType<typeof vi.fn>;
  let onWon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    generate = vi.fn().mockResolvedValue(generated);
    onWon = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoTesting({ 'play/en': playEn }),
        provideRouter(
          [
            { path: 'play', component: Play },
            { path: '**', component: Blank },
          ],
          withComponentInputBinding(),
        ),
        { provide: APP_STORAGE, useValue: new MemoryStorage() },
        { provide: EngineClient, useValue: { generate } },
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

  it('pauses the game when leaving the screen', async () => {
    const { harness, store } = await open('/play?difficulty=medium');
    await harness.navigateByUrl('/');
    expect(store.status()).toBe('paused');
  });
});
