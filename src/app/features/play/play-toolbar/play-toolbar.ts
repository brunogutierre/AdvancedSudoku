import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Difficulty } from '../../../core';
import { formatDuration } from '../../../shared/format/time';
import { Icon } from '../../../shared/ui/icon/icon';

/** Difficulty chip, timer, mistakes counter and pause/resume button above the board. */
@Component({
  selector: 'app-play-toolbar',
  imports: [TranslocoPipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [attr.data-difficulty]="difficulty()">
      <span class="dot" aria-hidden="true"></span>
      {{ 'difficulty.' + difficulty() | transloco }}
    </span>
    <!-- Not a live region: the clock is not announced every second. -->
    <span class="timer tnum" role="timer" [attr.aria-label]="'play.toolbar.time' | transloco">
      {{ paused() ? ('play.toolbar.paused' | transloco) : time() }}
    </span>
    <span class="end">
      @if (showMistakes()) {
        <span class="mistakes tnum">
          <app-icon name="close" [size]="16" />
          {{ 'play.toolbar.mistakes' | transloco: { count: mistakes() } }}
        </span>
      }
      <button
        type="button"
        class="pause"
        [disabled]="!canPause()"
        [attr.aria-label]="(paused() ? 'play.toolbar.resume' : 'play.toolbar.pause') | transloco"
        (click)="togglePause.emit()"
      >
        <app-icon [name]="paused() ? 'play' : 'pause'" />
      </button>
    </span>
  `,
  styleUrl: './play-toolbar.scss',
})
export class PlayToolbar {
  readonly difficulty = input.required<Difficulty>();
  readonly elapsedMs = input(0);
  readonly mistakes = input(0);
  readonly showMistakes = input(false);
  readonly paused = input(false);
  readonly canPause = input(true);
  readonly togglePause = output<void>();

  protected readonly time = computed(() => formatDuration(this.elapsedMs()));
}
