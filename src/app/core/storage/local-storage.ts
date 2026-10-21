import { Injectable } from '@angular/core';

/** Namespaced, versioned prefix for every persisted key (bump on breaking changes). */
export const STORAGE_PREFIX = 'advsudoku:v1:';

/**
 * Thin wrapper over `localStorage` that never throws (private mode, blocked storage),
 * so persistence is always a best-effort enhancement.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorage {
  get(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Persistence is optional.
    }
  }

  remove(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Persistence is optional.
    }
  }
}
