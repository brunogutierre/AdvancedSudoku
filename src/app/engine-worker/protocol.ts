import type { CandidateGrid, GeneratedPuzzle, Grid, Step, Tier } from '../engine';

/** Arguments and result of every command the engine worker understands. */
export interface EngineCommands {
  generate: { args: { tier: Tier; seed: string }; result: GeneratedPuzzle };
  daily: { args: { date: string }; result: GeneratedPuzzle };
  hint: { args: { grid: Grid; notes?: CandidateGrid; solution?: Grid }; result: Step | null };
  solve: { args: { grid: Grid }; result: Grid | null };
}

export type EngineCommand = keyof EngineCommands;
export type EngineArgs<K extends EngineCommand> = EngineCommands[K]['args'];
export type EngineResult<K extends EngineCommand> = EngineCommands[K]['result'];

/** Discriminated union of requests: `{ id, type: 'generate', tier, seed } | { id, type: 'daily', date } | ...` */
export type EngineRequest = {
  [K in EngineCommand]: { readonly id: number; readonly type: K } & EngineArgs<K>;
}[EngineCommand];

/** Responses echo the request id; failures carry a message instead of a result. */
export type EngineResponse =
  | {
      [K in EngineCommand]: {
        readonly id: number;
        readonly ok: true;
        readonly type: K;
        readonly result: EngineResult<K>;
      };
    }[EngineCommand]
  | { readonly id: number; readonly ok: false; readonly error: string };
