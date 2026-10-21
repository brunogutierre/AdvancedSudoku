import { Injectable, signal } from '@angular/core';

export interface ToastAction {
  /** Already-translated label. */
  readonly label: string;
  readonly run: () => void;
}

export interface ToastOptions {
  /** Already-translated message. */
  readonly message: string;
  readonly action?: ToastAction;
  /** Persistent toasts (e.g. "update available") stay until dismissed. */
  readonly persistent?: boolean;
  readonly durationMs?: number;
}

export interface Toast extends ToastOptions {
  readonly id: number;
}

export const TOAST_DURATION_MS = 5000;

/** Queue of transient messages rendered by ToastOutlet. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<readonly Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly toasts = this._toasts.asReadonly();

  show(options: ToastOptions): number {
    const id = this.nextId++;
    this._toasts.update((list) => [...list, { ...options, id }]);
    if (!options.persistent) {
      const timer = setTimeout(() => this.dismiss(id), options.durationMs ?? TOAST_DURATION_MS);
      this.timers.set(id, timer);
    }
    return id;
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this._toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
