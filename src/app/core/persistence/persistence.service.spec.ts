import { TestBed } from '@angular/core/testing';
import { MemoryStorage } from '../testing/memory-storage';
import { APP_STORAGE, PersistenceService, STORAGE_KEYS } from './persistence.service';

const isNumberArray = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((n) => typeof n === 'number');

describe('PersistenceService', () => {
  let storage: MemoryStorage;
  let service: PersistenceService;

  beforeEach(() => {
    storage = new MemoryStorage();
    TestBed.configureTestingModule({ providers: [{ provide: APP_STORAGE, useValue: storage }] });
    service = TestBed.inject(PersistenceService);
  });

  afterEach(() => vi.useRealTimers());

  it('round-trips JSON and validates on load', () => {
    service.save(STORAGE_KEYS.game, [1, 2, 3]);
    expect(service.load(STORAGE_KEYS.game, isNumberArray)).toEqual([1, 2, 3]);
    service.save(STORAGE_KEYS.game, ['x']);
    expect(service.load(STORAGE_KEYS.game, isNumberArray)).toBeNull();
    service.remove(STORAGE_KEYS.game);
    expect(service.load(STORAGE_KEYS.game, isNumberArray)).toBeNull();
  });

  it('treats corrupt JSON as missing', () => {
    storage.setItem(STORAGE_KEYS.game, '{not json');
    expect(service.load(STORAGE_KEYS.game, isNumberArray)).toBeNull();
  });

  it('swallows storage failures', () => {
    storage.failWrites = true;
    expect(() => service.save(STORAGE_KEYS.game, [1])).not.toThrow();
    expect(() => service.remove(STORAGE_KEYS.game)).not.toThrow();
  });

  it('works without storage', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: APP_STORAGE, useValue: null }] });
    const noStorage = TestBed.inject(PersistenceService);
    noStorage.save(STORAGE_KEYS.game, [1]);
    expect(noStorage.load(STORAGE_KEYS.game, isNumberArray)).toBeNull();
  });

  it('uses localStorage by default', () => {
    TestBed.resetTestingModule();
    expect(TestBed.inject(APP_STORAGE)).toBe(window.localStorage);
  });

  it('debounces writes and flushes on pagehide', () => {
    vi.useFakeTimers();
    let value = 1;
    const saver = service.createSaver(STORAGE_KEYS.game, () => [value], 100);
    saver.schedule();
    value = 2;
    saver.schedule();
    vi.advanceTimersByTime(99);
    expect(storage.getItem(STORAGE_KEYS.game)).toBeNull();
    vi.advanceTimersByTime(1);
    expect(storage.getItem(STORAGE_KEYS.game)).toBe('[2]');

    value = 3;
    saver.schedule();
    window.dispatchEvent(new Event('pagehide'));
    expect(storage.getItem(STORAGE_KEYS.game)).toBe('[3]');

    // Nothing pending: flush is a no-op.
    value = 4;
    saver.flush();
    expect(storage.getItem(STORAGE_KEYS.game)).toBe('[3]');
  });

  it('flushes pending writes when the injector is destroyed', () => {
    vi.useFakeTimers();
    service.createSaver(STORAGE_KEYS.game, () => ['bye']).schedule();
    TestBed.resetTestingModule();
    expect(storage.getItem(STORAGE_KEYS.game)).toBe('["bye"]');
  });
});
