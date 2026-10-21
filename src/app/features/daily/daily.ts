import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';
import { GameStore, StatsStore, addDays, dailyStreaks } from '../../core';
import { dailyTier } from '../../engine';
import { LanguageService } from '../../core/i18n/language.service';
import { formatDuration } from '../../shared/format/time';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Icon } from '../../shared/ui/icon/icon';
import { TODAY, dayState, formatDate, weekOf } from './week';

/** How far back the week strip can go. */
const MAX_WEEKS_BACK = 52;

/**
 * Daily challenge: the week strip (solved / missed / today / future), the selected day's
 * card and the streak. Only today's puzzle is playable, so a streak can't be backfilled.
 */
@Component({
  selector: 'app-daily',
  imports: [RouterLink, TranslocoPipe, Button, Card, Icon],
  providers: [provideTranslocoScope('daily')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './daily.html',
  styleUrl: './daily.scss',
})
export class Daily {
  protected readonly today = inject(TODAY);
  private readonly lang = inject(LanguageService).lang;
  private readonly stats = inject(StatsStore);
  private readonly game = inject(GameStore);

  protected readonly weekOffset = signal(0);
  protected readonly selected = signal(this.today);
  protected readonly canGoBack = computed(() => this.weekOffset() > -MAX_WEEKS_BACK);

  private readonly wins = computed(() => this.stats.data().dailyWins);
  protected readonly streak = computed(() => dailyStreaks(this.wins(), this.today).current);

  protected readonly days = computed(() => {
    const wins = this.wins();
    const lang = this.lang();
    return weekOf(addDays(this.today, 7 * this.weekOffset())).map((date) => {
      const state = dayState(date, this.today, date in wins);
      return {
        date,
        state,
        weekday: formatDate(date, lang, { weekday: 'narrow' }),
        dayOfMonth: Number(date.slice(8)),
        label: formatDate(date, lang, { weekday: 'long', month: 'long', day: 'numeric' }),
      };
    });
  });

  protected readonly month = computed(() =>
    formatDate(this.days()[3].date, this.lang(), { month: 'long', year: 'numeric' }),
  );

  protected readonly selectedLabel = computed(() =>
    formatDate(this.selected(), this.lang(), { weekday: 'long', month: 'long', day: 'numeric' }),
  );
  protected readonly selectedTier = computed(() => dailyTier(this.selected()));
  protected readonly selectedIsToday = computed(() => this.selected() === this.today);
  protected readonly selectedTime = computed(() => {
    const ms = this.wins()[this.selected()];
    return ms === undefined ? null : formatDuration(ms);
  });
  protected readonly bestTime = computed(() => {
    const times = Object.values(this.wins());
    return times.length ? formatDuration(Math.min(...times)) : null;
  });

  /** Today's daily is the saved, unfinished game. */
  protected readonly inProgress = computed(() => {
    const state = this.game.state();
    return (
      state.mode === 'daily' &&
      state.dailyDate === this.today &&
      (state.status === 'playing' || state.status === 'paused')
    );
  });

  protected shiftWeek(delta: number): void {
    const offset = Math.min(0, Math.max(-MAX_WEEKS_BACK, this.weekOffset() + delta));
    this.weekOffset.set(offset);
    const days = weekOf(addDays(this.today, 7 * offset));
    this.selected.set(days.includes(this.today) ? this.today : days[0]);
  }
}
