import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APP_STORAGE, GameStore } from '../../../core';
import { HapticsService } from '../../../core/feedback/haptics.service';
import { SoundService } from '../../../core/feedback/sound.service';
import { MemoryStorage } from '../../../core/testing/memory-storage';
import { KNOWN_PUZZLES } from '../../../engine/testing/fixtures';
import type { Board } from '../board/board';
import { connectFeel } from './connect-feel';

const wiki = KNOWN_PUZZLES[0];

@Component({ template: '' })
class Host {
  readonly animate = vi.fn();
  constructor() {
    connectFeel(signal({ animate: this.animate } as unknown as Board));
  }
}

describe('connectFeel', () => {
  function setup(reduced = false) {
    const play = vi.fn();
    const vibrate = vi.fn();
    document.documentElement.dataset['motion'] = reduced ? 'reduced' : 'full';
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_STORAGE, useValue: new MemoryStorage() },
        { provide: SoundService, useValue: { play } },
        { provide: HapticsService, useValue: { vibrate } },
      ],
    });
    const store = TestBed.inject(GameStore);
    store.newGame({
      puzzle: wiki.solution.slice(0, 2) + '.' + wiki.solution.slice(3, 80) + '.',
      solution: wiki.solution,
      difficulty: 'easy',
    });
    const fixture = TestBed.createComponent(Host);
    TestBed.tick();
    return { store, play, vibrate, animate: fixture.componentInstance.animate };
  }

  afterEach(() => delete document.documentElement.dataset['motion']);

  it('gives feedback for moves, conflicts, completions and the win', () => {
    const { store, play, vibrate, animate } = setup();
    store.select(2);
    store.input(5);
    TestBed.tick();
    expect(play).toHaveBeenCalledWith('error');
    expect(vibrate).toHaveBeenCalledWith('error');
    expect(animate).toHaveBeenCalledWith('shake', expect.any(Array));

    store.erase();
    TestBed.tick();
    expect(play).toHaveBeenCalledWith('erase');

    store.input(1, { note: true });
    TestBed.tick();
    expect(play).toHaveBeenCalledWith('note');
    store.input(1, { note: true });
    TestBed.tick();

    store.input(4);
    TestBed.tick();
    expect(play).toHaveBeenCalledWith('place', 4);
    expect(animate).toHaveBeenCalledWith('sweep', expect.any(Array));

    store.select(80);
    store.input(9);
    TestBed.tick();
    expect(play).toHaveBeenCalledWith('win');
    expect(vibrate).toHaveBeenCalledWith('win');
    expect(animate).toHaveBeenCalledWith('wave', expect.any(Array));
    expect(animate.mock.calls.at(-1)?.[1]).toHaveLength(81);
  });

  it('skips animations under reduced motion and ignores new games', () => {
    const { store, play, animate } = setup(true);
    store.select(2);
    store.input(4);
    TestBed.tick();
    expect(play).toHaveBeenCalledWith('place', 4);
    expect(animate).not.toHaveBeenCalled();

    play.mockClear();
    store.newGame({ puzzle: wiki.puzzle, solution: wiki.solution, difficulty: 'easy' });
    TestBed.tick();
    expect(play).not.toHaveBeenCalled();
  });
});
