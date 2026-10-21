import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';
import { DIFFICULTIES, StatsStore, dailyStreaks, summarize } from '../../core';
import type { Difficulty } from '../../core';
import { LanguageService } from '../../core/i18n/language.service';
import { formatDuration } from '../../shared/format/time';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Icon } from '../../shared/ui/icon/icon';
import { TODAY } from '../daily/week';
import { TimeChart } from './time-chart';

export type StatsFilter = Difficulty | 'all';

/** Games shown in the chart. */
const CHART_GAMES = 14;

@Component({
  selector: 'app-stats',
  imports: [RouterLink, TranslocoPipe, Button, Card, Icon, TimeChart],
  providers: [provideTranslocoScope('stats')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats.html',
  styleUrl: './stats.scss',
})
export class Stats {
  private readonly stats = inject(StatsStore);
  private readonly lang = inject(LanguageService).lang;
  private readonly today = inject(TODAY);

  protected readonly filters: readonly StatsFilter[] = ['all', ...DIFFICULTIES];
  protected readonly filter = signal<StatsFilter>('all');

  private readonly summary = computed(() => summarize(this.stats.data(), this.filter()));

  protected readonly kpis = computed(() => {
    const s = this.summary();
    const percent = new Intl.NumberFormat(this.lang(), { style: 'percent' });
    const time = (ms: number | null) => (ms === null ? null : formatDuration(ms));
    return [
      { key: 'played', value: String(s.played) },
      { key: 'winRate', value: s.winRate === null ? null : percent.format(s.winRate) },
      { key: 'best', value: time(s.bestMs) },
      { key: 'average', value: time(s.averageMs) },
    ];
  });

  protected readonly streaks = computed(() =>
    dailyStreaks(this.stats.data().dailyWins, this.today),
  );

  protected readonly recent = computed(() => {
    const filter = this.filter();
    const records = this.stats.data().recent;
    return (filter === 'all' ? records : records.filter((r) => r.difficulty === filter)).slice(
      -CHART_GAMES,
    );
  });
}
