import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';
import type { CandidateGrid, GeneratedPuzzle, Grid, Step, Tier } from '../engine';
import { createRng, randomInt, randomSeed, serializeGrid } from '../engine';
import type {
  EngineArgs,
  EngineCommand,
  EngineRequest,
  EngineResponse,
  EngineResult,
} from './protocol';

/** Creates the engine worker, or null where workers are unavailable (SSR, old browsers). */
export const ENGINE_WORKER_FACTORY = new InjectionToken<(() => Worker) | null>(
  'ENGINE_WORKER_FACTORY',
  {
    providedIn: 'root',
    factory: () =>
      typeof Worker === 'undefined'
        ? null
        : () => new Worker(new URL('./engine.worker', import.meta.url), { type: 'module' }),
  },
);

/** Milliseconds before a worker request is abandoned and re-run on the main thread. */
export const ENGINE_TIMEOUT_MS = new InjectionToken<number>('ENGINE_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => 8000,
});

/** Relative to the document base URL, so it works under any base href (e.g. /AdvancedSudoku/). */
export const INSANE_BANK_PATH = 'puzzles/insane.json';

interface BankEntry {
  readonly p: string;
  readonly t: string;
}

interface Pending {
  readonly request: EngineRequest;
  readonly resolve: (response: EngineResponse) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Promise-based facade over the engine Web Worker. Generation and hints run off the main
 * thread; if the worker cannot start, errors or times out, the request is executed on the
 * main thread instead (lazy-loaded), so callers always get an answer.
 */
@Injectable({ providedIn: 'root' })
export class EngineClient {
  private readonly createWorker = inject(ENGINE_WORKER_FACTORY);
  private readonly timeoutMs = inject(ENGINE_TIMEOUT_MS);
  private readonly document = inject(DOCUMENT);

  private worker: Worker | null = null;
  private workerBroken = false;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private bank: Promise<readonly BankEntry[]> | null = null;

  /** A new puzzle of the given tier. Insane puzzles come from the pre-generated bank. */
  async generate(tier: Tier, seed: string = randomSeed()): Promise<GeneratedPuzzle> {
    if (tier === 'insane') {
      const fromBank = await this.pickFromBank(seed);
      if (fromBank) return fromBank;
    }
    return this.request('generate', { tier, seed });
  }

  /** The deterministic puzzle of the day for a 'YYYY-MM-DD' date. */
  daily(date: string): Promise<GeneratedPuzzle> {
    return this.request('daily', { date });
  }

  /** Next hint for the board (a 'mistake' step when the board or notes are wrong), or null. */
  hint(grid: Grid, options: { notes?: CandidateGrid; solution?: Grid } = {}): Promise<Step | null> {
    return this.request('hint', { grid, ...options });
  }

  solve(grid: Grid): Promise<Grid | null> {
    return this.request('solve', { grid });
  }

  private async pickFromBank(seed: string): Promise<GeneratedPuzzle | null> {
    const bank = await this.loadBank();
    if (bank.length === 0) return null;
    const entry = bank[randomInt(createRng(`insane:${seed}`), 0, bank.length)];
    const grid = new Uint8Array(81);
    for (let i = 0; i < 81; i++) grid[i] = entry.p[i] === '.' ? 0 : Number(entry.p[i]);
    const solution = await this.solve(grid);
    return solution
      ? { puzzle: entry.p, solution: serializeGrid(solution), tier: 'insane', seed }
      : null;
  }

  /** Fetched once, lazily. A failed fetch yields an empty bank (generation fallback) and is retried next time. */
  private loadBank(): Promise<readonly BankEntry[]> {
    this.bank ??= fetch(new URL(INSANE_BANK_PATH, this.document.baseURI))
      .then((response) => (response.ok ? (response.json() as Promise<BankEntry[]>) : []))
      .catch(() => [] as BankEntry[])
      .then((entries) => {
        if (entries.length === 0) this.bank = null;
        return entries;
      });
    return this.bank;
  }

  private async request<K extends EngineCommand>(
    type: K,
    args: EngineArgs<K>,
  ): Promise<EngineResult<K>> {
    const request = { id: this.nextId++, type, ...args } as EngineRequest;
    const response = await this.dispatch(request);
    if (!response.ok) throw new Error(response.error);
    return response.result as EngineResult<K>;
  }

  private dispatch(request: EngineRequest): Promise<EngineResponse> {
    const worker = this.ensureWorker();
    if (!worker) return this.runInline(request);
    return new Promise<EngineResponse>((resolve) => {
      const timer = setTimeout(() => this.abandonWorker(), this.timeoutMs);
      this.pending.set(request.id, { request, resolve, timer });
      worker.postMessage(request);
    });
  }

  private ensureWorker(): Worker | null {
    if (this.worker || this.workerBroken || !this.createWorker) return this.worker;
    try {
      const worker = this.createWorker();
      worker.addEventListener('message', (event: MessageEvent<EngineResponse>) =>
        this.settle(event.data),
      );
      worker.addEventListener('error', () => {
        // A worker that fails to load or crashes is not retried: the main thread takes over.
        this.workerBroken = true;
        this.abandonWorker();
      });
      this.worker = worker;
    } catch {
      this.workerBroken = true;
    }
    return this.worker;
  }

  private settle(response: EngineResponse): void {
    const pending = this.pending.get(response.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(response.id);
    pending.resolve(response);
  }

  /** Terminates a stuck or broken worker and re-runs its pending requests inline. */
  private abandonWorker(): void {
    this.worker?.terminate();
    this.worker = null;
    const stranded = [...this.pending.values()];
    this.pending.clear();
    for (const { request, resolve, timer } of stranded) {
      clearTimeout(timer);
      void this.runInline(request).then(resolve);
    }
  }

  private async runInline(request: EngineRequest): Promise<EngineResponse> {
    const { handleEngineRequest } = await import('./handler');
    return handleEngineRequest(request);
  }
}
