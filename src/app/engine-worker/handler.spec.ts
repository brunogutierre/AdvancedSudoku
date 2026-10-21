import { parseGrid, serializeGrid } from '../engine';
import { KNOWN_PUZZLES } from '../engine/testing/fixtures';
import { handleEngineRequest } from './handler';

const wiki = KNOWN_PUZZLES[0];

describe('handleEngineRequest', () => {
  it('generates puzzles of the requested tier', () => {
    const response = handleEngineRequest({ id: 1, type: 'generate', tier: 'easy', seed: 's' });
    expect(response).toMatchObject({
      id: 1,
      ok: true,
      type: 'generate',
      result: { tier: 'easy', seed: 's' },
    });
  });

  it('builds the daily puzzle', () => {
    const response = handleEngineRequest({ id: 2, type: 'daily', date: '2026-10-19' });
    expect(response).toMatchObject({ id: 2, ok: true, result: { seed: 'daily:v1:2026-10-19' } });
  });

  it('returns hints and solutions', () => {
    const grid = parseGrid(wiki.puzzle);
    const hint = handleEngineRequest({ id: 3, type: 'hint', grid });
    expect(hint.ok && hint.type === 'hint' && hint.result?.placements.length).toBe(1);
    const solved = handleEngineRequest({ id: 4, type: 'solve', grid });
    expect(solved.ok && solved.type === 'solve' && serializeGrid(solved.result!)).toBe(
      wiki.solution,
    );
  });

  it('turns exceptions into error responses', () => {
    expect(handleEngineRequest({ id: 5, type: 'daily', date: 'nope' })).toEqual({
      id: 5,
      ok: false,
      error: 'Invalid daily date "nope", expected YYYY-MM-DD',
    });
  });
});
