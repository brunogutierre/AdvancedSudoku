import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';
import type { Difficulty } from '../../../core';
import { formatDuration } from '../../../shared/format/time';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { WIN_WAVE_MS } from '../feel/connect-feel';
import { Confetti } from './confetti';

/**
 * Completion screen: a modal sheet that rises after the board's win wave, with the time,
 * mistakes, hints, difficulty and a confetti burst. `personalBest` is the stats hook.
 */
@Component({
  selector: 'app-completion',
  imports: [RouterLink, TranslocoPipe, Button, Icon, Confetti],
  providers: [provideTranslocoScope('completion')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './completion.html',
  styleUrl: './completion.scss',
})
export class Completion {
  readonly difficulty = input.required<Difficulty>();
  readonly elapsedMs = input(0);
  readonly mistakes = input(0);
  readonly hintsUsed = input(0);
  /** Set by the stats feature when this time beats the best for the difficulty. */
  readonly personalBest = input(false);
  /** Lets the board's win wave play first. */
  readonly delayMs = input(WIN_WAVE_MS);
  readonly newGame = output<void>();

  protected readonly time = computed(() => formatDuration(this.elapsedMs()));
  protected readonly celebrating = signal(false);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    const timer = setTimeout(() => this.open(), this.delayMs());
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  /** Esc must not leave a solved board without its actions. */
  protected onCancel(event: Event): void {
    event.preventDefault();
  }

  private open(): void {
    const dialog = this.dialog().nativeElement;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    this.celebrating.set(true);
  }
}
