import { TestBed } from '@angular/core/testing';
import { parseGrid, serializeGrid } from '../engine';
import { KNOWN_PUZZLES } from '../engine/testing/fixtures';
import { ENGINE_TIMEOUT_MS, ENGINE_WORKER_FACTORY, EngineClient } from './engine-client';
import { handleEngineRequest } from './handler';
import type { EngineRequest, EngineResponse } from './protocol';

const wiki = KNOWN_PUZZLES[0];

type Mode = 'respond' | 'silent' | 'crash';

/** In-memory stand-in for the Web Worker: answers with the real handler on a microtask. */
class FakeWorker {
  readonly received: EngineRequest[] = [];
  terminated = false;
  private readonly listeners: Record<string, ((event: unknown) => void)[]> = {};

  constructor(private readonly mode: Mode) {}

  addEventListener(type: string, listener: (event: unknown) => void): void {
    (this.listeners[type] ??= []).push(listener);
  }

  postMessage(request: EngineRequest): void {
    this.received.push(request);
    if (this.mode === 'respond') {
      queueMicrotask(() =>
        this.emit('message', { data: handleEngineRequest(request) satisfies EngineResponse }),
      );
    } else if (this.mode === 'crash') {
      queueMicrotask(() => this.emit('error', {}));
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  private emit(type: string, event: unknown): void {
    for (const listener of this.listeners[type] ?? []) listener(event);
  }
}

function setup(factory: (() => Worker) | null, timeoutMs = 8000): EngineClient {
  TestBed.configureTestingModule({
    providers: [
      { provide: ENGINE_WORKER_FACTORY, useValue: factory },
      { provide: ENGINE_TIMEOUT_MS, useValue: timeoutMs },
    ],
  });
  return TestBed.inject(EngineClient);
}

function workerFactory(mode: Mode): { factory: () => Worker; workers: FakeWorker[] } {
  const workers: FakeWorker[] = [];
  const factory = () => {
    const worker = new FakeWorker(mode);
    workers.push(worker);
    return worker as unknown as Worker;
  };
  return { factory, workers };
}

describe('EngineClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('runs commands in the worker and correlates responses', async () => {
    const { factory, workers } = workerFactory('respond');
    const client = setup(factory);
    const grid = parseGrid(wiki.puzzle);
    const [generated, daily, hint, solution] = await Promise.all([
      client.generate('easy', 'seed'),
      client.daily('2026-10-19'),
      client.hint(grid),
      client.solve(grid),
    ]);
    expect(generated).toMatchObject({ tier: 'easy', seed: 'seed' });
    expect(daily.seed).toBe('daily:v1:2026-10-19');
    expect(hint?.placements).toHaveLength(1);
    expect(serializeGrid(solution!)).toBe(wiki.solution);
    expect(workers).toHaveLength(1);
    expect(workers[0].received.map((r) => r.type)).toEqual(['generate', 'daily', 'hint', 'solve']);
  });

  it('uses a random seed when none is given', async () => {
    const client = setup(workerFactory('respond').factory);
    const generated = await client.generate('easy');
    expect(generated.seed).toMatch(/^[0-9a-z]+$/);
  });

  it('rejects with the engine error message', async () => {
    const client = setup(workerFactory('respond').factory);
    await expect(client.daily('bad')).rejects.toThrow('Invalid daily date "bad"');
  });

  it('falls back to the main thread when the worker times out', async () => {
    const { factory, workers } = workerFactory('silent');
    const client = setup(factory, 10);
    const solution = await client.solve(parseGrid(wiki.puzzle));
    expect(serializeGrid(solution!)).toBe(wiki.solution);
    expect(workers[0].terminated).toBe(true);
    // A fresh worker is created for the next request.
    void client.solve(parseGrid(wiki.puzzle));
    expect(workers).toHaveLength(2);
  });

  it('stops using a worker that errors', async () => {
    const { factory, workers } = workerFactory('crash');
    const client = setup(factory);
    expect(serializeGrid((await client.solve(parseGrid(wiki.puzzle)))!)).toBe(wiki.solution);
    expect(serializeGrid((await client.solve(parseGrid(wiki.puzzle)))!)).toBe(wiki.solution);
    expect(workers).toHaveLength(1);
  });

  it('runs inline without worker support or when the worker cannot start', async () => {
    expect((await setup(null).generate('easy', 'x')).tier).toBe('easy');
    TestBed.resetTestingModule();
    const throwing = setup(() => {
      throw new Error('blocked by CSP');
    });
    expect((await throwing.generate('easy', 'x')).tier).toBe('easy');
  });

  describe('insane puzzles', () => {
    const bank = [{ p: wiki.puzzle.replaceAll('0', '.'), t: 'xyWing' }];

    it('picks a seeded puzzle from the bank, relative to the base href', async () => {
      const fetchMock = vi.fn(async () => new Response(JSON.stringify(bank)));
      vi.stubGlobal('fetch', fetchMock);
      const base = document.createElement('base');
      base.href = '/AdvancedSudoku/';
      document.head.appendChild(base);
      try {
        const client = setup(workerFactory('respond').factory);
        const puzzle = await client.generate('insane', 'abc');
        expect(puzzle).toEqual({
          puzzle: bank[0].p,
          solution: wiki.solution,
          tier: 'insane',
          seed: 'abc',
        });
        await client.generate('insane', 'def');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(
          /\/AdvancedSudoku\/puzzles\/insane\.json$/,
        );
      } finally {
        base.remove();
      }
    });

    it('generates on the fly when the bank cannot be loaded, and retries the fetch later', async () => {
      const fetchMock = vi.fn(async () => new Response('', { status: 404 }));
      vi.stubGlobal('fetch', fetchMock);
      const client = setup(workerFactory('respond').factory);
      const puzzle = await client.generate('insane', 'spec');
      expect(puzzle.tier).toBe('insane');
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Promise.reject(new Error('offline'))),
      );
      expect((await client.generate('insane', 'spec')).puzzle).toBe(puzzle.puzzle);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
