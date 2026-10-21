/** In-memory Storage for specs; `failWrites` simulates a full or blocked storage. */
export class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  failWrites = false;

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    if (this.failWrites) throw new Error('blocked');
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new DOMException('full', 'QuotaExceededError');
    this.data.set(key, value);
  }
}
