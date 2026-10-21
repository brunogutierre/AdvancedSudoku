import type { Step } from '../../../engine';
import { explainKey, explainParams, nameKey, overlayFromStep, stepTier } from './hint-view';

function step(partial: Partial<Step>): Step {
  return {
    technique: 'nakedPair',
    placements: [],
    eliminations: [],
    highlights: { cells: [], units: [], digits: [] },
    explainKey: 'technique.nakedPair.explain',
    params: {},
    ...partial,
  };
}

/** Echoes the key and params so tests can see what was asked for. */
const echo = (key: string, params?: Record<string, unknown>) => `${key}${JSON.stringify(params)}`;

describe('hint view', () => {
  it('builds the overlay of a technique step', () => {
    const overlay = overlayFromStep(
      step({
        placements: [{ cell: 4, digit: 7 }],
        eliminations: [
          { cell: 10, digit: 2 },
          { cell: 10, digit: 5 },
          { cell: 11, digit: 2 },
        ],
        highlights: { cells: [4, 20, 21], units: [{ type: 'row', index: 2 }], digits: [2] },
      }),
    );
    expect([...overlay.place]).toEqual([[4, 7]]);
    expect([...overlay.eliminate]).toEqual([
      [10, 0b10010],
      [11, 0b10],
    ]);
    expect([...overlay.pattern]).toEqual([20, 21]);
    expect(overlay.units).toEqual([{ type: 'row', index: 2 }]);
    expect(overlay.mistake.size).toBe(0);
  });

  it('marks the cells of a mistake step', () => {
    const overlay = overlayFromStep(
      step({ technique: 'mistake', highlights: { cells: [3], units: [], digits: [] } }),
    );
    expect([...overlay.mistake]).toEqual([3]);
    expect(overlay.place.size + overlay.eliminate.size + overlay.pattern.size).toBe(0);
  });

  it('maps steps to tiers and translation keys', () => {
    expect(stepTier(step({ technique: 'xyWing' }))).toBe('insane');
    expect(stepTier(step({ technique: 'mistake' }))).toBeNull();
    expect(nameKey(step({}))).toBe('hints.technique.nakedPair.name');
    expect(explainKey(step({}))).toBe('hints.technique.nakedPair.explain');
  });

  it('adds localized unit phrases', () => {
    const single = explainParams(step({ params: { digit: 4, unit: 'box', unitIndex: 9 } }), echo);
    expect(single).toEqual({
      digit: 4,
      unit: 'box',
      unitIndex: 9,
      unitName: 'hints.unit.box.name{"index":9}',
      inUnit: 'hints.unit.box.in{"index":9}',
      ofUnit: 'hints.unit.box.of{"index":9}',
    });
    const fish = explainParams(
      step({
        params: {
          digit: 5,
          baseUnit: 'row',
          baseIndices: '2, 6',
          coverUnit: 'col',
          coverIndices: '2, 7',
        },
      }),
      echo,
    );
    expect(fish['inBases']).toBe('hints.units.row.in{"list":"2, 6"}');
    expect(fish['inCovers']).toBe('hints.units.col.in{"list":"2, 7"}');
    expect(fish['ofCovers']).toBe('hints.units.col.of{"list":"2, 7"}');
    expect(explainParams(step({ params: { cell: 'R1C1' } }), echo)).toEqual({ cell: 'R1C1' });
  });
});
