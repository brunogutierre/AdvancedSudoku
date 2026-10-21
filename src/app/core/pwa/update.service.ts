import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  InjectionToken,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { TranslocoService } from '@jsverse/transloco';
import { filter } from 'rxjs';
import { GameStore } from '../game/game-store';
import { ToastService } from '../toast/toast.service';

/** Reloads the page (a token so tests can observe it). */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => {
    const location = inject(DOCUMENT).location;
    return () => location.reload();
  },
});

/** How often an open tab asks the server for a new version. */
export const UPDATE_CHECK_MS = 6 * 60 * 60 * 1000;

/**
 * Offers a reload when the service worker has a new version ready. The offer waits while a
 * game is being played, so nobody is interrupted mid-puzzle; the game is saved and paused
 * before reloading, and resumes afterwards.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly sw = inject(SwUpdate);
  private readonly game = inject(GameStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly reloadPage = inject(PAGE_RELOAD);
  private readonly destroyRef = inject(DestroyRef);

  /** A new version is installed (or the current one is broken) and needs a reload. */
  readonly updateReady = signal(false);
  private offered = false;

  constructor() {
    effect(() => {
      if (this.updateReady() && this.game.status() !== 'playing' && !this.offered) {
        this.offered = true;
        this.toasts.show({
          message: this.transloco.translate('update.available'),
          persistent: true,
          action: { label: this.transloco.translate('update.reload'), run: () => this.reload() },
        });
      }
    });
  }

  start(): void {
    if (!this.sw.isEnabled) {
      return;
    }
    this.sw.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.updateReady.set(true));
    this.sw.unrecoverable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateReady.set(true));
    const timer = setInterval(
      () => void this.sw.checkForUpdate().catch(() => false),
      UPDATE_CHECK_MS,
    );
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  reload(): void {
    this.game.pause();
    this.reloadPage();
  }
}
