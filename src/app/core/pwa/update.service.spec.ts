import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { provideTranslocoTesting } from '../../../testing/i18n';
import { KNOWN_PUZZLES } from '../../engine/testing/fixtures';
import { GameStore } from '../game/game-store';
import { APP_STORAGE } from '../persistence/persistence.service';
import { MemoryStorage } from '../testing/memory-storage';
import { ToastService } from '../toast/toast.service';
import { PAGE_RELOAD, UPDATE_CHECK_MS, UpdateService } from './update.service';

const wiki = KNOWN_PUZZLES[0];

describe('UpdateService', () => {
  function setup(isEnabled = true) {
    const versionUpdates = new Subject<{ type: string }>();
    const unrecoverable = new Subject<unknown>();
    const checkForUpdate = vi.fn(() => Promise.resolve(false));
    const reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoTesting(),
        { provide: APP_STORAGE, useValue: new MemoryStorage() },
        {
          provide: SwUpdate,
          useValue: { isEnabled, versionUpdates, unrecoverable, checkForUpdate },
        },
        { provide: PAGE_RELOAD, useValue: reload },
      ],
    });
    const service = TestBed.inject(UpdateService);
    service.start();
    return {
      service,
      versionUpdates,
      unrecoverable,
      checkForUpdate,
      reload,
      toasts: TestBed.inject(ToastService),
      game: TestBed.inject(GameStore),
    };
  }

  it('offers a reload once a new version is ready', () => {
    const { versionUpdates, toasts, reload } = setup();
    versionUpdates.next({ type: 'VERSION_DETECTED' });
    TestBed.tick();
    expect(toasts.toasts()).toEqual([]);

    versionUpdates.next({ type: 'VERSION_READY' });
    versionUpdates.next({ type: 'VERSION_READY' });
    TestBed.tick();
    expect(toasts.toasts().length).toBe(1);
    const [toast] = toasts.toasts();
    expect(toast.message).toBe('A new version is available.');
    expect(toast.persistent).toBe(true);
    toast.action!.run();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('waits while a game is being played and pauses it before reloading', () => {
    const { unrecoverable, toasts, game, service, reload } = setup();
    game.newGame({ puzzle: wiki.puzzle, solution: wiki.solution, difficulty: 'easy' });
    unrecoverable.next({});
    TestBed.tick();
    expect(service.updateReady()).toBe(true);
    expect(toasts.toasts()).toEqual([]);

    game.pause();
    TestBed.tick();
    expect(toasts.toasts().length).toBe(1);

    game.resume();
    service.reload();
    expect(game.status()).toBe('paused');
    expect(reload).toHaveBeenCalled();
  });

  it('checks for updates periodically', () => {
    vi.useFakeTimers();
    const { checkForUpdate } = setup();
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(checkForUpdate).toHaveBeenCalledOnce();
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(checkForUpdate).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('does nothing when the service worker is disabled', () => {
    const { versionUpdates, toasts } = setup(false);
    versionUpdates.next({ type: 'VERSION_READY' });
    TestBed.tick();
    expect(toasts.toasts()).toEqual([]);
  });
});
