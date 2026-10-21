import { formatDuration } from './time';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [-5, '0:00'],
    [9_999, '0:09'],
    [65_000, '1:05'],
    [3_599_000, '59:59'],
    [3_600_000, '1:00:00'],
    [3_725_000, '1:02:05'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});
