import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ALL_DIGITS } from '../../../engine';
import type { Digit } from '../../../engine';
import { Icon } from '../../../shared/ui/icon/icon';

/** Digits 1-9 with how many of each are still missing; completed digits are dimmed. */
@Component({
  selector: 'app-number-pad',
  imports: [TranslocoPipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'group', '[attr.aria-label]': 'label()', '[class.notes]': 'notesMode()' },
  template: `
    @for (key of keys(); track key.digit) {
      <button
        type="button"
        class="key"
        [class.done]="key.remaining === 0"
        [attr.data-digit]="key.digit"
        [attr.aria-disabled]="key.remaining === 0 || null"
        [attr.aria-label]="
          key.remaining === 0
            ? ('play.pad.done' | transloco: { digit: key.digit })
            : ('play.pad.digit' | transloco: { digit: key.digit, count: key.remaining })
        "
        (click)="digit.emit(key.digit)"
      >
        <span class="value" aria-hidden="true">{{ key.digit }}</span>
        <span class="badge tnum" aria-hidden="true">
          @if (key.remaining === 0) {
            <app-icon name="check" [size]="14" />
          } @else {
            {{ key.remaining }}
          }
        </span>
      </button>
    }
  `,
  styleUrl: './number-pad.scss',
})
export class NumberPad {
  /** Occurrences per digit on the board (index 1-9). */
  readonly label = input.required<string>();
  readonly counts = input.required<readonly number[]>();
  readonly notesMode = input(false);
  readonly digit = output<Digit>();

  protected readonly keys = computed(() =>
    ALL_DIGITS.map((digit) => ({ digit, remaining: Math.max(0, 9 - (this.counts()[digit] ?? 0)) })),
  );
}
