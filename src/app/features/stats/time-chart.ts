import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { GameRecord } from '../../core';
import { formatDuration } from '../../shared/format/time';

const WIDTH = 320;
const HEIGHT = 160;
/** Room above the tallest bar for the "best" label. */
const TOP = 18;
const BAR = 8;

/**
 * Solve times of recent wins as an SVG bar chart (no chart library): one bar per game, colored
 * by difficulty, assisted games faded, fastest unassisted game labeled. A visually hidden table
 * carries the same data for screen readers.
 */
@Component({
  selector: 'app-time-chart',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      role="img"
      [attr.aria-label]="'stats.chart.summary' | transloco: { count: records().length }"
    >
      @for (line of gridlines(); track line.y) {
        <line class="grid" x1="0" [attr.x2]="width" [attr.y1]="line.y" [attr.y2]="line.y" />
        <text class="axis tnum" x="0" [attr.y]="line.y - 4">{{ line.label }}</text>
      }
      @for (bar of bars(); track $index) {
        <rect
          [attr.data-difficulty]="bar.difficulty"
          [class.assisted]="bar.assisted"
          [attr.x]="bar.x"
          [attr.y]="bar.y"
          [attr.width]="barWidth"
          [attr.height]="bar.height"
          rx="3"
        />
        @if (bar.best) {
          <text class="best tnum" [attr.x]="bar.x + barWidth / 2" [attr.y]="bar.y - 6">
            {{ bar.time }}
          </text>
        }
      }
    </svg>
    <table class="visually-hidden">
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
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .grid {
      stroke: var(--line-thin);
      stroke-width: 1;
    }
    .axis {
      fill: var(--text-muted);
      font-size: 10px;
    }
    rect {
      fill: var(--easy);
    }
    rect[data-difficulty='medium'] {
      fill: var(--medium);
    }
    rect[data-difficulty='hard'] {
      fill: var(--hard);
    }
    rect[data-difficulty='insane'] {
      fill: var(--insane);
    }
    rect.assisted {
      opacity: 0.4;
    }
    .best {
      fill: var(--text);
      font-size: 11px;
      font-weight: var(--fw-semibold);
      text-anchor: middle;
    }
    @media (forced-colors: active) {
      rect {
        fill: CanvasText;
      }
    }
  `,
})
export class TimeChart {
  /** Oldest first. */
  readonly records = input.required<readonly GameRecord[]>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly barWidth = BAR;

  private readonly maxMs = computed(() => Math.max(1, ...this.records().map((r) => r.elapsedMs)));

  protected readonly bars = computed(() => {
    const records = this.records();
    const max = this.maxMs();
    const step = WIDTH / Math.max(records.length, 1);
    const unassisted = records.filter((r) => !r.assisted).map((r) => r.elapsedMs);
    const best = unassisted.length ? Math.min(...unassisted) : -1;
    let labeled = false;
    return records.map((r, i) => {
      const height = Math.max(2, ((HEIGHT - TOP) * r.elapsedMs) / max);
      const isBest = !labeled && !r.assisted && r.elapsedMs === best;
      labeled ||= isBest;
      return {
        x: i * step + (step - BAR) / 2,
        y: HEIGHT - height,
        height,
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
    return [1, 2, 3].map((k) => ({
      y: HEIGHT - ((HEIGHT - TOP) * k) / 3,
      label: formatDuration((max * k) / 3),
    }));
  });
}
