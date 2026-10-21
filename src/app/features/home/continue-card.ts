import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Difficulty } from '../../core';
import { formatDuration } from '../../shared/format/time';
import { Button } from '../../shared/ui/button/button';

const RADIUS = 33;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Saved game summary: progress ring, difficulty, elapsed time and a Continue button. */
@Component({
  selector: 'app-continue-card',
  imports: [RouterLink, TranslocoPipe, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-difficulty]': 'difficulty()' },
  template: `
    <svg class="ring" viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
      <circle class="track" cx="36" cy="36" [attr.r]="radius" />
      <circle
        class="value"
        cx="36"
        cy="36"
        [attr.r]="radius"
        [attr.stroke-dasharray]="circumference"
        [attr.stroke-dashoffset]="offset()"
      />
      <text x="36" y="36" class="tnum">{{ percent() }}%</text>
    </svg>
    <div class="info">
      <p class="eyebrow">{{ 'home.continue.eyebrow' | transloco }}</p>
      <span class="chip">{{ 'difficulty.' + difficulty() | transloco }}</span>
      <p class="time tnum">{{ time() }}</p>
      <p class="cells">{{ 'home.continue.cells' | transloco: { filled: filled() } }}</p>
    </div>
    <a
      app-button
      routerLink="/play"
      [attr.aria-label]="
        'home.continue.label'
          | transloco: { difficulty: ('difficulty.' + difficulty() | transloco) }
      "
      >{{ 'home.continue.cta' | transloco }}</a
    >
  `,
  styleUrl: './continue-card.scss',
})
export class ContinueCard {
  readonly difficulty = input.required<Difficulty>();
  readonly elapsedMs = input(0);
  /** Filled cells, givens included. */
  readonly filled = input(0);
  /** 0..1 */
  readonly progress = input(0);

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;
  protected readonly percent = computed(() => Math.round(this.progress() * 100));
  protected readonly offset = computed(() => CIRCUMFERENCE * (1 - this.progress()));
  protected readonly time = computed(() => formatDuration(this.elapsedMs()));
}
