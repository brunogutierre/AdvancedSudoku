import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { GameRecord } from '../../core';
import { formatDuration } from '../../shared/format/time';

/**
 * Solve times of recent wins as a bar chart in plain HTML/CSS (no chart library): one bar per game, colored
 * by difficulty, assisted games faded, fastest unassisted game labeled. A visually hidden table
 * carries the same data for screen readers.
 */
@Component({
  selector: 'app-time-chart',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="plot"
      role="img"
      [attr.aria-label]="'stats.chart.summary' | transloco: { count: records().length }"
    >
      @for (line of gridlines(); track line.label) {
        <div class="grid" [style.bottom.%]="line.pct">
          <span class="axis tnum">{{ line.label }}</span>
        </div>
      }
      <div class="bars">
        @for (bar of bars(); track $index) {
          <div
            class="bar"
            [attr.data-difficulty]="bar.difficulty"
            [class.assisted]="bar.assisted"
            [style.height.%]="bar.pct"
          >
            @if (bar.best) {
              <span class="best tnum">{{ bar.time }}</span>
            }
          </div>
        }
      </div>
    </div>
    <!-- Tables ignore width: 1px, so the hiding box is a wrapper (no page overflow on phones). -->
    <div class="visually-hidden">
      <table>
        <caption>
          {{
            'stats.chart.summary' | transloco: { count: records().length }
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ 'stats.chart.game' | transloco }}</th>
            <th scope="col">{{ 'stats.chart.difficulty' | transloco }}</th>
            <th scope="col">{{ 'stats.chart.time' | transloco }}</th>
          </tr>
        </thead>
        <tbody>
          @for (bar of bars(); track $index) {
            <tr>
              <td>{{ $index + 1 }}</td>
              <td>{{ 'difficulty.' + bar.difficulty | transloco }}</td>
              <td>
                {{ bar.time
                }}{{ bar.assisted ? ' (' + ('stats.chart.assisted' | transloco) + ')' : '' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    /* HTML bars instead of a scaled SVG: text stays at its real size, bars stay 8px wide. */
    .plot {
      position: relative;
      height: 160px;
      margin-top: 18px;
    }
    .grid {
      position: absolute;
      left: 44px;
      right: 0;
      border-top: 1px solid var(--line-thin);
    }
    .axis {
      position: absolute;
      left: -44px;
      top: 0;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: var(--fs-xs);
    }
    .bars {
      position: absolute;
      inset: 0 0 0 44px;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
    }
    .bar {
      position: relative;
      width: 8px;
      min-height: 2px;
      border-radius: var(--r-xs) var(--r-xs) 0 0;
      background: var(--easy);
    }
    .bar[data-difficulty='medium'] {
      background: var(--medium);
    }
    .bar[data-difficulty='hard'] {
      background: var(--hard);
    }
    .bar[data-difficulty='insane'] {
      background: var(--insane);
    }
    .bar.assisted {
      opacity: 0.4;
    }
    .best {
      position: absolute;
      bottom: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      color: var(--text);
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      white-space: nowrap;
    }
    @media (forced-colors: active) {
      .bar {
        background: CanvasText;
      }
    }
  `,
})
export class TimeChart {
  /** Oldest first. */
  readonly records = input.required<readonly GameRecord[]>();

  private readonly maxMs = computed(() => Math.max(1, ...this.records().map((r) => r.elapsedMs)));

  protected readonly bars = computed(() => {
    const records = this.records();
    const max = this.maxMs();
    const unassisted = records.filter((r) => !r.assisted).map((r) => r.elapsedMs);
    const best = unassisted.length ? Math.min(...unassisted) : -1;
    let labeled = false;
    return records.map((r) => {
      const isBest = !labeled && !r.assisted && r.elapsedMs === best;
      labeled ||= isBest;
      return {
        pct: (100 * r.elapsedMs) / max,
        difficulty: r.difficulty,
        assisted: r.assisted,
        best: isBest,
        time: formatDuration(r.elapsedMs),
      };
    });
  });

  /** Three horizontal guides at 1/3, 2/3 and 3/3 of the longest time. */
  protected readonly gridlines = computed(() => {
    const max = this.maxMs();
    return [1, 2, 3].map((k) => ({ pct: (100 * k) / 3, label: formatDuration((max * k) / 3) }));
  });
}
