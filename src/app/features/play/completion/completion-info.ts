import { dailyStreaks, isAssisted } from '../../../core';
import type { GameState, StatsData } from '../../../core';

export interface CompletionInfo {
  readonly personalBest: boolean;
  /** Current daily streak, for daily games only. */
  readonly dailyStreak: number | null;
}

export const NO_COMPLETION_INFO: CompletionInfo = { personalBest: false, dailyStreak: null };

/**
 * True when an unassisted win beats the previous best for its difficulty.
 * Must be evaluated BEFORE the win is recorded (afterwards the best is this very time).
 */
export function isNewBest(stats: StatsData, game: GameState): boolean {
  const previous = stats.perDifficulty[game.difficulty].bestMs;
  return !isAssisted(game) && previous !== null && game.elapsedMs < previous;
}

/** Streak including this win: evaluate AFTER the win is recorded. */
export function dailyStreakAfterWin(stats: StatsData, game: GameState): number | null {
  if (game.mode !== 'daily' || !game.dailyDate) {
    return null;
  }
  return dailyStreaks(stats.dailyWins, game.dailyDate).current;
}
