import { Injectable, effect, inject, signal } from '@angular/core';
import type { Difficulty, GameState } from '../game/game.model';
import { PersistenceService, STORAGE_KEYS } from '../persistence/persistence.service';
import type { StatsData } from './stats.model';
import { emptyStats, isStatsData, withStart, withWin } from './stats.model';

/**
 * Game statistics, persisted locally. It records games started and games won (win rate =
 * won / started, so abandoned games lower it); times only count unassisted wins.
 */
@Injectable({ providedIn: 'root' })
export class StatsStore {
  private readonly persistence = inject(PersistenceService);
  private readonly _data = signal<StatsData>(
    this.persistence.load(STORAGE_KEYS.stats, isStatsData) ?? emptyStats(),
  );
  private readonly saver = this.persistence.createSaver(STORAGE_KEYS.stats, () => this._data());

  readonly data = this._data.asReadonly();

  constructor() {
    effect(() => {
      this._data();
      this.saver.schedule();
    });
  }

  recordStart(difficulty: Difficulty): void {
    this._data.update((data) => withStart(data, difficulty));
  }

  recordWin(game: GameState, finishedAt = new Date()): void {
    this._data.update((data) => withWin(data, game, finishedAt));
  }

  reset(): void {
    this._data.set(emptyStats());
  }
}
