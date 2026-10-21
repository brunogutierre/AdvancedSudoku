import { TestBed } from '@angular/core/testing';
import { TOAST_DURATION_MS, ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('queues toasts and auto-dismisses them', () => {
    const toasts = TestBed.inject(ToastService);
    const a = toasts.show({ message: 'A' });
    toasts.show({ message: 'B', durationMs: 10_000 });
    expect(toasts.toasts().map((t) => t.message)).toEqual(['A', 'B']);

    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(toasts.toasts().map((t) => t.message)).toEqual(['B']);
    expect(toasts.toasts().some((t) => t.id === a)).toBe(false);

    vi.advanceTimersByTime(5000);
    expect(toasts.toasts()).toEqual([]);
  });

  it('keeps persistent toasts until dismissed', () => {
    const toasts = TestBed.inject(ToastService);
    const id = toasts.show({ message: 'Update', persistent: true });
    vi.advanceTimersByTime(60_000);
    expect(toasts.toasts().length).toBe(1);

    toasts.dismiss(id);
    expect(toasts.toasts()).toEqual([]);
  });
});
