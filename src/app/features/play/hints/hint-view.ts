import { techniqueTier } from '../../../engine';
import type { CandidateMask, CellIndex, Digit, Step, Tier, UnitRef } from '../../../engine';

/** What the board draws for an open hint. */
export interface BoardOverlay {
  /** Cells the hint fills, with the digit shown as a ghost. */
  readonly place: ReadonlyMap<CellIndex, Digit>;
  /** Candidates the hint removes, per cell. */
  readonly eliminate: ReadonlyMap<CellIndex, CandidateMask>;
  /** Cells that form the pattern (pair cells, fish corners, wing pivot and pincers...). */
  readonly pattern: ReadonlySet<CellIndex>;
  /** Units the pattern lives in, outlined on the board. */
  readonly units: readonly UnitRef[];
  /** Cells holding a wrong digit or a wrong note (mistake steps). */
  readonly mistake: ReadonlySet<CellIndex>;
}

export function overlayFromStep(step: Step): BoardOverlay {
  if (step.technique === 'mistake') {
    return {
      place: new Map(),
      eliminate: new Map(),
      pattern: new Set(),
      units: [],
      mistake: new Set(step.highlights.cells),
    };
  }
  const place = new Map(step.placements.map((p) => [p.cell, p.digit] as const));
  const eliminate = new Map<CellIndex, CandidateMask>();
  for (const { cell, digit } of step.eliminations) {
    eliminate.set(cell, (eliminate.get(cell) ?? 0) | (1 << (digit - 1)));
  }
  return {
    place,
    eliminate,
    pattern: new Set(step.highlights.cells.filter((cell) => !place.has(cell))),
    units: step.highlights.units,
    mistake: new Set(),
  };
}

/** Difficulty tier of the technique, or null for a mistake. */
export function stepTier(step: Step): Tier | null {
  return step.technique === 'mistake' ? null : techniqueTier(step.technique);
}

/** Key of the step's name in the `hints` scope. */
export function nameKey(step: Step): string {
  return `hints.technique.${step.technique}.name`;
}

/** Key of the step's explanation in the `hints` scope (the engine key, prefixed). */
export function explainKey(step: Step): string {
  return `hints.${step.explainKey}`;
}

export type Translate = (key: string, params?: Record<string, unknown>) => string;

/**
 * Engine params plus localized phrases the sentences need: a unit with its preposition
 * ("in row 3" / "na linha 3" / "dans le bloc 3") must be translated as a whole because the
 * article depends on the unit's gender in pt-BR, es and fr.
 */
export function explainParams(step: Step, t: Translate): Record<string, string | number> {
  const p = step.params;
  const derived: Record<string, string> = {};
  if (typeof p['unit'] === 'string') {
    const unit = `hints.unit.${p['unit']}`;
    const index = { index: p['unitIndex'] };
    derived['unitName'] = t(`${unit}.name`, index);
    derived['inUnit'] = t(`${unit}.in`, index);
    derived['ofUnit'] = t(`${unit}.of`, index);
  }
  if (typeof p['baseUnit'] === 'string' && typeof p['coverUnit'] === 'string') {
    const bases = { list: p['baseIndices'] };
    const covers = { list: p['coverIndices'] };
    derived['inBases'] = t(`hints.units.${p['baseUnit']}.in`, bases);
    derived['inCovers'] = t(`hints.units.${p['coverUnit']}.in`, covers);
    derived['ofCovers'] = t(`hints.units.${p['coverUnit']}.of`, covers);
  }
  return { ...p, ...derived };
}
