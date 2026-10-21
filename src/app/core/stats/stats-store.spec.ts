import { TestBed } from '@angular/core/testing';
import { parseGrid } from '../../engine';
import type { GameState } from '../game/game.model';
import { APP_STORAGE, STORAGE_KEYS } from '../persistence/persistence.service';
import { MemoryStorage } from '../testing/memory-storage';
import { StatsStore } from './stats-store';

function setup(storage = new MemoryStorage()) {
  TestBed.configureTestingModule({ providers: [{ provide: APP_STORAGE, useValue: storage }] });
  return { store: TestBed.inject(StatsStore), storage };
}

describe('StatsStore', () => {
  afterEach(() => vi.useRealTimers());

  it('records games and persists them (debounced)', () => {
    vi.useFakeTimers();
    const { store, storage } = setup();
    store.recordStart('hard');
    const grid = parseGrid('.'.repeat(81));
    store.recordWin({
      puzzle: grid,
      solution: grid,
      values: grid,
      notes: new Uint16Array(81),
      selected: null,
      notesMode: false,
      difficulty: 'hard',
      mode: 'classic',
      dailyDate: null,
      seed: null,
      elapsedMs: 1000,
      status: 'won',
      mistakes: 0,
      hintsUsed: 0,
      assisted: false,
    } satisfies GameState);
    expect(store.data().perDifficulty.hard).toMatchObject({ started: 1, won: 1, bestMs: 1000 });
    TestBed.tick();
    vi.runAllTimers();

    TestBed.resetTestingModule();
    expect(setup(storage).store.data().perDifficulty.hard.won).toBe(1);
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.stats)!).recent).toHaveLength(1);
  });

  it('starts empty on corrupt data and can be reset', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.stats, '{"perDifficulty": 3}');
    const { store } = setup(storage);
    expect(store.data().recent).toEqual([]);
    store.recordStart('easy');
    store.reset();
    expect(store.data().perDifficulty.easy.started).toBe(0);
  });
});
