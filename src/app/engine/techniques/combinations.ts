/** All k-element combinations of `items`, in lexicographic order of indices. */
export function* combinations<T>(
  items: readonly T[],
  k: number,
  start = 0,
  prefix: T[] = [],
): Generator<T[]> {
  if (prefix.length === k) {
    yield [...prefix];
    return;
  }
  for (let i = start; i <= items.length - (k - prefix.length); i++) {
    prefix.push(items[i]);
    yield* combinations(items, k, i + 1, prefix);
    prefix.pop();
  }
}
