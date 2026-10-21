import { InjectionToken } from '@angular/core';
import type { GameState } from '../../core';

/** Called once when a game is solved during this session (stats, completion screen, sound). */
export type GameWonHandler = (game: GameState) => void;

/**
 * Extension point for completion: provide handlers with `multi: true`, e.g.
 * `{ provide: GAME_WON_HANDLERS, useValue: recordWin, multi: true }`.
 */
export const GAME_WON_HANDLERS = new InjectionToken<readonly GameWonHandler[]>('GAME_WON_HANDLERS');
