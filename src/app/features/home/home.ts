import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';
import { GameStore, StatsStore, dailyStreaks, summarize } from '../../core';
import { dailyTier } from '../../engine';
import { formatDuration } from '../../shared/format/time';
import { Icon } from '../../shared/ui/icon/icon';
import { TODAY } from '../daily/week';
import { LanguageService } from '../../core/i18n/language.service';
import { Button } from '../../shared/ui/button/button';
import { ContinueCard } from './continue-card';

/** Mirrors the engine's difficulty levels (the engine PR owns the canonical type). */
export const HOME_DIFFICULTIES = ['easy', 'medium', 'hard', 'insane'] as const;
export type HomeDifficulty = (typeof HOME_DIFFICULTIES)[number];

export type DayPart = 'morning' | 'afternoon' | 'evening';

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  return hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslocoPipe, Button, ContinueCard, Icon],
  providers: [provideTranslocoScope('home')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly lang = inject(LanguageService).lang;
  private readonly now = new Date();
  private readonly game = inject(GameStore);
  private readonly stats = inject(StatsStore);
  private readonly todayDate = inject(TODAY);

  protected readonly dailyTier = dailyTier(this.todayDate);
  protected readonly streaks = computed(() =>
    dailyStreaks(this.stats.data().dailyWins, this.todayDate),
  );
  /** Today's daily time when it is solved. */
  protected readonly dailyDone = computed(() => {
    const ms = this.stats.data().dailyWins[this.todayDate];
    return ms === undefined ? null : formatDuration(ms);
  });
  /** Best unassisted time per difficulty card. */
  protected readonly bestTimes = computed(() => {
    const per = this.stats.data().perDifficulty;
    return Object.fromEntries(
      HOME_DIFFICULTIES.map((d) => {
        const ms = per[d].bestMs;
        return [d, ms === null ? null : formatDuration(ms)];
      }),
    ) as Record<HomeDifficulty, string | null>;
  });
  protected readonly quickStats = computed(() => {
    const all = summarize(this.stats.data(), 'all');
    return [
      { key: 'won', value: String(all.won) },
      { key: 'streak', value: String(this.streaks().longest) },
      { key: 'average', value: all.averageMs === null ? null : formatDuration(all.averageMs) },
    ];
  });

  /** The unfinished saved game, if any. */
  protected readonly saved = computed(() => {
    const status = this.game.status();
    if (status !== 'playing' && status !== 'paused') {
      return null;
    }
    return {
      difficulty: this.game.difficulty(),
      elapsedMs: this.game.elapsedMs(),
      filled: this.game.digitCounts().reduce((sum, n) => sum + n, 0),
      progress: this.game.progress(),
    };
  });

  protected readonly difficulties = HOME_DIFFICULTIES;
  protected readonly greetingKey = `home.greeting.${dayPart(this.now.getHours())}`;
  protected readonly today = computed(() =>
    new Intl.DateTimeFormat(this.lang(), { weekday: 'long', month: 'long', day: 'numeric' }).format(
      this.now,
    ),
  );
  protected readonly todayShort = computed(() =>
    new Intl.DateTimeFormat(this.lang(), { month: 'long', day: 'numeric' }).format(this.now),
  );

  /** Roving focus across the difficulty cards: arrows, Home and End. */
  protected onCardKeydown(event: KeyboardEvent, index: number): void {
    const count = this.difficulties.length;
    const targets: Record<string, number> = {
      ArrowRight: (index + 1) % count,
      ArrowDown: (index + 1) % count,
      ArrowLeft: (index - 1 + count) % count,
      ArrowUp: (index - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    const target = targets[event.key];
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    const list = (event.currentTarget as HTMLElement).closest('ul');
    const cards = list?.querySelectorAll<HTMLElement>('a.difficulty');
    cards?.forEach((card, i) => (card.tabIndex = i === target ? 0 : -1));
    cards?.[target]?.focus();
  }
}
