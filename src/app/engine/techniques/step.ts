import { cellName } from '../peers';
import type { CandidateGrid, CellIndex, Digit, Grid, UnitRef, UnitType } from '../types';

/** Logical techniques known by the engine, from cheapest to most advanced. */
export type TechniqueId =
  | 'fullHouse'
  | 'nakedSingle'
  | 'hiddenSingle'
  | 'pointing'
  | 'boxLineReduction'
  | 'nakedPair'
  | 'hiddenPair'
  | 'nakedTriple'
  | 'hiddenTriple'
  | 'xWing'
  | 'swordfish'
  | 'xyWing';

/** A step is either a technique or a pointer to a user mistake. */
export type StepKind = TechniqueId | 'mistake';

export type Tier = 'easy' | 'medium' | 'hard' | 'insane';

export interface Placement {
  readonly cell: CellIndex;
  readonly digit: Digit;
}

export interface Elimination {
  readonly cell: CellIndex;
  readonly digit: Digit;
}

export interface StepHighlights {
  /** Cells that form the pattern (pivot, pair cells, fish corners...). */
  readonly cells: CellIndex[];
  /** Units the pattern lives in; `index` is 0-based. */
  readonly units: UnitRef[];
  /** Digits involved in the pattern. */
  readonly digits: Digit[];
}

/** One deduction, with everything a UI needs to show and explain it. */
export interface Step {
  readonly technique: StepKind;
  readonly placements: Placement[];
  readonly eliminations: Elimination[];
  readonly highlights: StepHighlights;
  /** i18n key, e.g. `technique.xWing.explain`. */
  readonly explainKey: string;
  /** Interpolation values for the explanation; numbers shown to users are 1-based. */
  readonly params: Record<string, string | number>;
}

/** Read-only view of a board with its pencil marks. Filled cells have a 0 mask. */
export interface CandidateState {
  readonly grid: Grid;
  readonly candidates: CandidateGrid;
}

/** A technique inspects the state and returns the first deduction it finds, or null. */
export type Technique = (state: CandidateState) => Step | null;

export function explainKey(technique: StepKind, variant = 'explain'): string {
  return `technique.${technique}.${variant}`;
}

/** "R1C1, R1C5" */
export function cellList(cells: readonly CellIndex[]): string {
  return cells.map(cellName).join(', ');
}

/** "2, 7" */
export function numberList(values: readonly number[]): string {
  return values.join(', ');
}

/** Params describing a unit for explanations: `{ unit: 'row', unitIndex: 3 }` (1-based). */
export function unitParams(type: UnitType, index: number): { unit: UnitType; unitIndex: number } {
  return { unit: type, unitIndex: index + 1 };
}
