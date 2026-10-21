import { resolveKey } from './play-keys';

const key = (init: KeyboardEventInit) => resolveKey(new KeyboardEvent('keydown', init));

describe('resolveKey', () => {
  it('maps digits by physical key, with Shift for notes and 0 for erase', () => {
    expect(key({ code: 'Digit5', key: '5' })).toEqual({ type: 'digit', digit: 5, note: false });
    expect(key({ code: 'Numpad3', key: '3' })).toEqual({ type: 'digit', digit: 3, note: false });
    expect(key({ code: 'Digit7', key: '&', shiftKey: true })).toEqual({
      type: 'digit',
      digit: 7,
      note: true,
    });
    expect(key({ code: 'Digit0', key: '0' })).toEqual({ type: 'erase' });
  });

  it('maps editing, history and pause keys', () => {
    expect(key({ key: 'Backspace' })).toEqual({ type: 'erase' });
    expect(key({ key: 'Delete' })).toEqual({ type: 'erase' });
    expect(key({ code: 'KeyN', key: 'n' })).toEqual({ type: 'notes' });
    expect(key({ code: 'KeyH', key: 'h' })).toEqual({ type: 'hint' });
    expect(key({ code: 'KeyZ', key: 'z', ctrlKey: true })).toEqual({ type: 'undo' });
    expect(key({ code: 'KeyZ', key: 'Z', metaKey: true, shiftKey: true })).toEqual({
      type: 'redo',
    });
    expect(key({ code: 'KeyY', key: 'y', ctrlKey: true })).toEqual({ type: 'redo' });
    expect(key({ code: 'KeyP', key: 'p' })).toEqual({ type: 'pause', toggle: true });
    expect(key({ key: 'Escape' })).toEqual({ type: 'pause', toggle: false });
  });

  it('maps navigation keys and ignores everything else', () => {
    expect(key({ key: 'ArrowLeft' })).toEqual({ type: 'move', key: 'ArrowLeft', ctrl: false });
    expect(key({ key: 'Home', ctrlKey: true })).toEqual({ type: 'move', key: 'Home', ctrl: true });
    expect(key({ code: 'KeyC', key: 'c', ctrlKey: true })).toBeNull();
    expect(key({ code: 'Digit1', key: '1', altKey: true })).toBeNull();
    expect(key({ code: 'KeyQ', key: 'q' })).toBeNull();
  });
});
