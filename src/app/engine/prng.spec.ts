import { createRng, cyrb53, randomInt, randomSeed, shuffle } from './prng';

describe('prng', () => {
  it('hashes strings deterministically and seed-dependently', () => {
    expect(cyrb53('a')).toBe(cyrb53('a'));
    expect(cyrb53('a')).not.toBe(cyrb53('b'));
    expect(cyrb53('a', 1)).not.toBe(cyrb53('a', 2));
    expect(Number.isSafeInteger(cyrb53('daily:v1:2026-10-21'))).toBe(true);
  });

  it('produces the same sequence for the same seed', () => {
    const a = createRng('seed');
    const b = createRng('seed');
    const c = createRng('seed2');
    const seqA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
    expect(Array.from({ length: 5 }, c)).not.toEqual(seqA);
  });

  it('pins the sequence so seeded puzzles stay stable across releases', () => {
    const rng = createRng('golden');
    const values = Array.from({ length: 3 }, () => randomInt(rng, 0, 1_000_000));
    expect(values).toEqual([899010, 977594, 676370]);
  });

  it('stays in [0, 1) and is roughly uniform', () => {
    const rng = createRng('uniform');
    const buckets = new Array<number>(10).fill(0);
    for (let i = 0; i < 10_000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      buckets[Math.floor(v * 10)]++;
    }
    for (const b of buckets) expect(b).toBeGreaterThan(850);
  });

  it('draws integers in range and shuffles in place', () => {
    const rng = createRng('ints');
    for (let i = 0; i < 1000; i++) {
      const n = randomInt(rng, 3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThan(7);
    }
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const result = shuffle(rng, items);
    expect(result).toBe(items);
    expect([...items].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('creates random seeds', () => {
    expect(randomSeed()).toMatch(/^[0-9a-z]+$/);
  });
});
