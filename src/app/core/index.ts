/** Public API of the core state layer, for feature components. */
export * from './game/game.model';
export * from './game/game-store';
export type { BoardSnapshot, CellViewOptions } from './game/game-selectors';
export * from './settings/settings.model';
export * from './settings/settings-store';
export { APP_STORAGE, STORAGE_KEYS } from './persistence/persistence.service';
