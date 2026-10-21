import { boxLineReduction, pointing } from './intersections';
import { fullHouse, hiddenSingle, nakedSingle } from './singles';
import type { Technique, TechniqueId, Tier } from './step';
import { hiddenPair, hiddenTriple, nakedPair, nakedTriple } from './subsets';
import { swordfish, xWing } from './fish';
import { xyWing } from './wings';

export interface LadderRung {
  readonly id: TechniqueId;
  readonly tier: Tier;
  readonly find: Technique;
}

/** Difficulty tiers from easiest to hardest. */
export const TIERS: readonly Tier[] = ['easy', 'medium', 'hard', 'insane'];

/**
 * Techniques in the order a human would try them: always the cheapest first.
 * A puzzle's tier is the tier of the hardest rung needed to solve it.
 */
export const LADDER: readonly LadderRung[] = [
  { id: 'fullHouse', tier: 'easy', find: fullHouse },
  { id: 'nakedSingle', tier: 'easy', find: nakedSingle },
  { id: 'hiddenSingle', tier: 'easy', find: hiddenSingle },
  { id: 'pointing', tier: 'medium', find: pointing },
  { id: 'boxLineReduction', tier: 'medium', find: boxLineReduction },
  { id: 'nakedPair', tier: 'medium', find: nakedPair },
  { id: 'hiddenPair', tier: 'medium', find: hiddenPair },
  { id: 'nakedTriple', tier: 'hard', find: nakedTriple },
  { id: 'hiddenTriple', tier: 'hard', find: hiddenTriple },
  { id: 'xWing', tier: 'hard', find: xWing },
  { id: 'swordfish', tier: 'insane', find: swordfish },
  { id: 'xyWing', tier: 'insane', find: xyWing },
];

export function tierRank(tier: Tier): number {
  return TIERS.indexOf(tier);
}

export function techniqueTier(id: TechniqueId): Tier {
  return LADDER.find((rung) => rung.id === id)!.tier;
}
