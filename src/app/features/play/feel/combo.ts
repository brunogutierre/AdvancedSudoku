import { DOCUMENT, DestroyRef, inject } from '@angular/core';
import { GameStore } from '../../../core';
import { HapticsService } from '../../../core/feedback/haptics.service';
import { SoundService } from '../../../core/feedback/sound.service';
import { applyStep, computeCandidates, findStep } from '../../../engine';
import type { Grid, Step } from '../../../engine';

export const KONAMI = [
  'arrowup',
  'arrowup',
  'arrowdown',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'arrowleft',
  'arrowright',
  'b',
  'a',
] as const;

/**
 * Calls `onCombo` when the Konami code is typed. Listens in the capture phase and swallows
 * the final key, so the game's own shortcut for "A" (fill candidates) does not fire.
 */
export function connectKonami(onCombo: () => void): void {
  const document = inject(DOCUMENT);
  const recent: string[] = [];
  const listener = (event: KeyboardEvent) => {
    recent.push(event.key.toLowerCase());
    if (recent.length > KONAMI.length) {
      recent.shift();
    }
    // A rolling window instead of a counter: "up up up down..." still matches.
    if (recent.length === KONAMI.length && recent.every((key, i) => key === KONAMI[i])) {
      recent.length = 0;
      event.preventDefault();
      onCombo();
    }
  };
  document.addEventListener('keydown', listener, { capture: true });
  inject(DestroyRef).onDestroy(() =>
    document.removeEventListener('keydown', listener, { capture: true }),
  );
}

/**
 * Every naked / hidden single (and full house) reachable from the board, applied in a
 * cascade. Stops at the first deduction that disagrees with the solution, which happens when
 * the player's digits are wrong.
 */
export function singlesCascade(values: Grid, solution: Grid): Step[] {
  const state = { grid: new Uint8Array(values), candidates: computeCandidates(values) };
  const steps: Step[] = [];
  for (let step = findStep(state, 'easy'); step; step = findStep(state, 'easy')) {
    if (step.placements.some(({ cell, digit }) => solution[cell] !== digit)) {
      break;
    }
    applyStep(state, step);
    steps.push(step);
  }
  return steps;
}

/** The combo itself: 8-bit arpeggio, a strong vibration, then the singles are filled in. */
export function createComboBreaker(): () => void {
  const store = inject(GameStore);
  const sound = inject(SoundService);
  const haptics = inject(HapticsService);
  return () => {
    sound.play('combo');
    haptics.vibrate('combo');
    const { values, solution } = store.state();
    store.assist(singlesCascade(values, solution));
  };
}
