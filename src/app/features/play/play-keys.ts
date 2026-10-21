import type { Digit } from '../../engine';

export type PlayCommand =
  | { readonly type: 'digit'; readonly digit: Digit; readonly note: boolean }
  | { readonly type: 'erase' | 'notes' | 'undo' | 'redo' | 'hint' }
  /** `toggle: false` only pauses (Esc); P toggles pause/resume. */
  | { readonly type: 'pause'; readonly toggle: boolean }
  | { readonly type: 'move'; readonly key: string; readonly ctrl: boolean };

const MOVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

/**
 * Maps a keydown to a game command. Digits use `event.code` so Shift+digit (a note) works on
 * every keyboard layout; letters use codes too (N notes, H hint, P pause, Ctrl+Z / Ctrl+Y /
 * Ctrl+Shift+Z).
 */
export function resolveKey(event: KeyboardEvent): PlayCommand | null {
  if (event.altKey) {
    return null;
  }
  const ctrl = event.ctrlKey || event.metaKey;
  if (MOVE_KEYS.has(event.key)) {
    return { type: 'move', key: event.key, ctrl };
  }
  if (ctrl) {
    if (event.code === 'KeyZ') {
      return { type: event.shiftKey ? 'redo' : 'undo' };
    }
    return event.code === 'KeyY' ? { type: 'redo' } : null;
  }
  const digit = /^(?:Digit|Numpad)([0-9])$/.exec(event.code);
  if (digit) {
    const n = Number(digit[1]);
    return n === 0 ? { type: 'erase' } : { type: 'digit', digit: n as Digit, note: event.shiftKey };
  }
  switch (event.key) {
    case 'Backspace':
    case 'Delete':
      return { type: 'erase' };
    case 'Escape':
      return { type: 'pause', toggle: false };
  }
  switch (event.code) {
    case 'KeyN':
      return { type: 'notes' };
    case 'KeyH':
      return { type: 'hint' };
    case 'KeyP':
      return { type: 'pause', toggle: true };
    default:
      return null;
  }
}
