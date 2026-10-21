import { dailyPuzzle, generatePuzzle, nextStep, solve } from '../engine';
import type { EngineRequest, EngineResponse } from './protocol';

/**
 * Executes one engine request. Pure and synchronous: the worker calls it for every
 * message, and the client calls it on the main thread when no worker is available.
 */
export function handleEngineRequest(request: EngineRequest): EngineResponse {
  const { id } = request;
  try {
    switch (request.type) {
      case 'generate':
        return {
          id,
          ok: true,
          type: 'generate',
          result: generatePuzzle(request.tier, request.seed),
        };
      case 'daily':
        return { id, ok: true, type: 'daily', result: dailyPuzzle(request.date) };
      case 'hint':
        return {
          id,
          ok: true,
          type: 'hint',
          result: nextStep(request.grid, { candidates: request.notes, solution: request.solution }),
        };
      case 'solve':
        return { id, ok: true, type: 'solve', result: solve(request.grid) };
    }
  } catch (error) {
    return { id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
