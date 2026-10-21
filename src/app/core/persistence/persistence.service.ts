import { DestroyRef, DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';

/** Every key is namespaced and versioned: bump the version when a stored shape changes incompatibly. */
export const STORAGE_KEYS = {
  game: 'advsudoku:v1:game',
  settings: 'advsudoku:v1:settings',
  stats: 'advsudoku:v1:stats',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** The Web Storage used for persistence; null when unavailable (private mode, SSR, blocked). */
export const APP_STORAGE = new InjectionToken<Storage | null>('APP_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return inject(DOCUMENT).defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  },
});

/** Delay used to coalesce bursts of state changes into one write. */
export const SAVE_DEBOUNCE_MS = 400;

/** A save that waits for a quiet period; `flush` writes immediately if something is pending. */
export interface DebouncedSaver {
  schedule(): void;
  flush(): void;
}

/**
 * Thin, failure-tolerant wrapper over localStorage. Values are JSON; reads are validated
 * with a type guard, so corrupt or foreign data is treated as missing.
 */
@Injectable({ providedIn: 'root' })
export class PersistenceService {
  private readonly storage = inject(APP_STORAGE);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  load<T>(key: StorageKey, isValid: (value: unknown) => value is T): T | null {
    try {
      const raw = this.storage?.getItem(key);
      if (raw == null) return null;
      const value: unknown = JSON.parse(raw);
      return isValid(value) ? value : null;
    } catch {
      return null;
    }
  }

  save(key: StorageKey, value: unknown): void {
    try {
      this.storage?.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage blocked: the game keeps working, it just is not persisted.
    }
  }

  remove(key: StorageKey): void {
    try {
      this.storage?.removeItem(key);
    } catch {
      // Ignore, see save().
    }
  }

  /**
   * Debounced writer for `key`. Pending writes are flushed on `pagehide`, the last event
   * reliably fired when a mobile browser closes or backgrounds the tab.
   */
  createSaver(
    key: StorageKey,
    snapshot: () => unknown,
    delayMs = SAVE_DEBOUNCE_MS,
  ): DebouncedSaver {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      this.save(key, snapshot());
    };
    const schedule = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    };
    const view = this.document.defaultView;
    view?.addEventListener('pagehide', flush);
    this.destroyRef.onDestroy(() => {
      view?.removeEventListener('pagehide', flush);
      flush();
    });
    return { schedule, flush };
  }
}
