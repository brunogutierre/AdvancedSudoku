/** A pseudo-random generator returning floats uniformly distributed in [0, 1). */
export type Rng = () => number;

/**
 * cyrb53: fast, well-distributed 53-bit string hash (public domain, bryc).
 * Used to turn human-readable seeds such as "daily:v1:2026-10-21" into numbers.
 */
export function cyrb53(text: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** sfc32 (Small Fast Counting, Chris Doty-Humphrey): 128-bit state, passes PractRand. */
export function sfc32(a: number, b: number, c: number, d: number): Rng {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Deterministic generator seeded from a string: same seed, same sequence, on every platform. */
export function createRng(seed: string): Rng {
  const rng = sfc32(
    cyrb53(seed, 1) >>> 0,
    cyrb53(seed, 2) >>> 0,
    cyrb53(seed, 3) >>> 0,
    cyrb53(seed, 4) >>> 0,
  );
  // Discard the first outputs so similar seeds diverge quickly.
  for (let i = 0; i < 12; i++) rng();
  return rng;
}

/** Integer uniformly distributed in [min, maxExclusive). */
export function randomInt(rng: Rng, min: number, maxExclusive: number): number {
  return min + Math.floor(rng() * (maxExclusive - min));
}

/** Fisher-Yates shuffle, in place. Returns the same array for chaining. */
export function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

/** A random seed string for non-deterministic games. */
export function randomSeed(): string {
  return Math.floor(Math.random() * 2 ** 52).toString(36);
}
