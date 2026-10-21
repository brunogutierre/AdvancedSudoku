import { DOCUMENT, Signal, effect, inject, untracked } from '@angular/core';
import { GameStore } from '../../../core';
import type { CellView, GameStatus } from '../../../core';
import { HapticsService } from '../../../core/feedback/haptics.service';
import { SoundService } from '../../../core/feedback/sound.service';
import { prefersReducedMotion } from '../../../core/theme/theme-transition';
import type { Grid } from '../../../engine';
import type { Board } from '../board/board';
import { diffBoard } from './board-events';

/** Delay before the completion screen, so the diagonal win wave can play first. */
export const WIN_WAVE_MS = 700;

/**
 * Turns board changes into sound, haptics and board animations. Call it in the Play
 * component's injection context; it reacts to GameStore only, so every input path
 * (keyboard, pad, picker, undo) gets the same feedback.
 */
export function connectFeel(board: Signal<Board | undefined>): void {
  const store = inject(GameStore);
  const sound = inject(SoundService);
  const haptics = inject(HapticsService);
  const document = inject(DOCUMENT);
  let prevCells: readonly CellView[] | null = null;
  let prevPuzzle: Grid | null = null;
  let prevStatus: GameStatus = store.status();

  effect(() => {
    const cells = store.cells();
    const status = store.status();
    untracked(() => {
      const puzzle = store.state().puzzle;
      const sameGame = puzzle === prevPuzzle;
      const animate = (...args: Parameters<Board['animate']>) => {
        if (!prefersReducedMotion(document)) {
          board()?.animate(...args);
        }
      };
      if (sameGame && prevCells && (status === 'playing' || status === 'won')) {
        for (const event of diffBoard(prevCells, cells)) {
          switch (event.type) {
            case 'place':
              sound.play('place', event.digit);
              haptics.vibrate('tap');
              animate('pop', [event.cell]);
              break;
            case 'erase':
              sound.play('erase');
              haptics.vibrate('tap');
              break;
            case 'note':
              sound.play('note');
              haptics.vibrate('tap');
              animate('note', [event.cell]);
              break;
            case 'conflict':
              sound.play('error');
              haptics.vibrate('error');
              animate('shake', event.cells);
              break;
            case 'unit':
              sound.play('unit');
              haptics.vibrate('unit');
              animate('sweep', event.cells);
              break;
            case 'digit':
              animate('pulse', event.cells);
              break;
          }
        }
      }
      if (sameGame && status === 'won' && prevStatus === 'playing') {
        sound.play('win');
        haptics.vibrate('win');
        animate(
          'wave',
          cells.map((cell) => cell.index),
        );
      }
      prevCells = cells;
      prevPuzzle = puzzle;
      prevStatus = status;
    });
  });
}
