import {
  ALL_CANDIDATES,
  bitToDigit,
  digitBit,
  digitsOf,
  hasDigit,
  lowestDigit,
  maskOf,
  popcount,
} from './bits';
import { ALL_DIGITS, isDigit } from './types';

describe('bits', () => {
  it('maps digits to bits and back', () => {
    for (const d of ALL_DIGITS) {
      expect(digitBit(d)).toBe(1 << (d - 1));
      expect(bitToDigit(digitBit(d))).toBe(d);
    }
  });

  it('counts bits', () => {
    expect(popcount(0)).toBe(0);
    expect(popcount(ALL_CANDIDATES)).toBe(9);
    expect(popcount(0b101010)).toBe(3);
    expect(popcount(0xffffffff)).toBe(32);
  });

  it('lists, builds and queries masks', () => {
    const mask = maskOf([2, 5, 9]);
    expect(digitsOf(mask)).toEqual([2, 5, 9]);
    expect(lowestDigit(mask)).toBe(2);
    expect(hasDigit(mask, 5)).toBe(true);
    expect(hasDigit(mask, 4)).toBe(false);
    expect(digitsOf(0)).toEqual([]);
    expect(digitsOf(ALL_CANDIDATES)).toEqual(ALL_DIGITS);
  });

  it('recognizes digits', () => {
    expect(isDigit(1)).toBe(true);
    expect(isDigit(9)).toBe(true);
    expect(isDigit(0)).toBe(false);
    expect(isDigit(10)).toBe(false);
    expect(isDigit(1.5)).toBe(false);
  });
});
