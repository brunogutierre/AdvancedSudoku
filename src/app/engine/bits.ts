import type { CandidateMask, Digit } from './types';

/** Mask with all nine digits set. */
export const ALL_CANDIDATES: CandidateMask = 0x1ff;

/** Mask containing only `digit`. */
export function digitBit(digit: Digit): CandidateMask {
  return 1 << (digit - 1);
}

export function hasDigit(mask: CandidateMask, digit: Digit): boolean {
  return (mask & (1 << (digit - 1))) !== 0;
}

/** Number of set bits (SWAR popcount, valid for any 32-bit value). */
export function popcount(mask: CandidateMask): number {
  let v = mask - ((mask >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/** Smallest digit in the mask. The mask must not be empty. */
export function lowestDigit(mask: CandidateMask): Digit {
  return (31 - Math.clz32(mask & -mask) + 1) as Digit;
}

/** Digit of a single-bit mask. Equivalent to {@link lowestDigit} for singletons. */
export function bitToDigit(bit: CandidateMask): Digit {
  return lowestDigit(bit);
}

/** Digits of the mask in ascending order. */
export function digitsOf(mask: CandidateMask): Digit[] {
  const digits: Digit[] = [];
  for (let m = mask; m !== 0; m &= m - 1) {
    digits.push(lowestDigit(m));
  }
  return digits;
}

/** Builds a mask from a list of digits. */
export function maskOf(digits: Iterable<Digit>): CandidateMask {
  let mask = 0;
  for (const d of digits) mask |= 1 << (d - 1);
  return mask;
}
