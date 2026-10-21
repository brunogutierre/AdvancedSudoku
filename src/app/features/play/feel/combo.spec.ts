import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APP_STORAGE, GameStore } from '../../../core';
import { HapticsService } from '../../../core/feedback/haptics.service';
import { SoundService } from '../../../core/feedback/sound.service';
import { MemoryStorage } from '../../../core/testing/memory-storage';
import { parseGrid } from '../../../engine';
import { KNOWN_PUZZLES } from '../../../engine/testing/fixtures';
import { ComboBanner, COMBO_BANNER_MS } from '../combo-banner/combo-banner';
import { KONAMI, connectKonami, createComboBreaker, singlesCascade } from './combo';

const wiki = KNOWN_PUZZLES[0];

@Component({ template: '' })
class Listener {
  readonly hits = vi.fn();
  constructor() {
    connectKonami(this.hits);
  }
}

const type = (keys: readonly string[]) =>
  keys.map((key) => {
    const event = new KeyboardEvent('keydown', { key, cancelable: true });
    document.dispatchEvent(event);
    return event;
  });

describe('Konami combo', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_STORAGE, useValue: new MemoryStorage() },
        { provide: SoundService, useValue: { play: vi.fn() } },
        { provide: HapticsService, useValue: { vibrate: vi.fn() } },
      ],
    });
  });

  it('detects the code (also after a false start) and swallows the final key', () => {
    const fixture = TestBed.createComponent(Listener);
    const keys = KONAMI.map((k) =>
      k.startsWith('arrow') ? 'Arrow' + k[5].toUpperCase() + k.slice(6) : k,
    );
    const events = type(['ArrowUp', 'x', 'ArrowUp', 'ArrowUp', ...keys]);
    expect(fixture.componentInstance.hits).toHaveBeenCalledOnce();
    expect(events.at(-1)?.defaultPrevented).toBe(true);
    expect(events.at(-2)?.defaultPrevented).toBe(false);
    fixture.destroy();
    type(keys);
    expect(fixture.componentInstance.hits).toHaveBeenCalledOnce();
  });

  it('cascades singles that agree with the solution and stops at wrong boards', () => {
    const puzzle = parseGrid(wiki.puzzle);
    const solution = parseGrid(wiki.solution);
    const steps = singlesCascade(puzzle, solution);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((s) => s.placements.every((p) => solution[p.cell] === p.digit))).toBe(true);

    const wrong = new Uint8Array(puzzle);
    const fakeSolution = new Uint8Array(solution).map((d) => (d % 9) + 1);
    expect(singlesCascade(wrong, fakeSolution)).toEqual([]);
  });

  it('fills the singles as one assisted, undoable move', () => {
    const store = TestBed.inject(GameStore);
    store.newGame({ puzzle: wiki.puzzle, solution: wiki.solution, difficulty: 'easy' });
    const combo = TestBed.runInInjectionContext(() => createComboBreaker());
    const empty = () => store.cells().filter((c) => c.value === 0).length;
    combo();
    // This easy puzzle needs singles only: the cascade solves it.
    expect(empty()).toBe(0);
    expect(store.isWon()).toBe(true);
    expect(store.state().assisted).toBe(true);
    expect(store.hintsUsed()).toBe(0);
    expect(TestBed.inject(SoundService).play).toHaveBeenCalledWith('combo');

    store.newGame({ puzzle: wiki.puzzle, solution: wiki.solution, difficulty: 'easy' });
    store.assist(singlesCascade(parseGrid(wiki.puzzle), parseGrid(wiki.solution)).slice(0, 3));
    expect(store.canUndo()).toBe(true);
    store.undo();
    expect(empty()).toBe(51);

    store.pause();
    store.assist([]);
    expect(store.status()).toBe('paused');
  });

  it('shows the banner and reports when it is done', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(ComboBanner);
    const done = vi.fn();
    fixture.componentInstance.done.subscribe(done);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-label')).toBe('COMBO BREAKER!!');
    expect(host.querySelectorAll('.letter').length).toBe(15);
    vi.advanceTimersByTime(COMBO_BANNER_MS);
    expect(done).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
