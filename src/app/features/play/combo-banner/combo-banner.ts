import { ChangeDetectionStrategy, Component, DestroyRef, inject, output } from '@angular/core';

/** Slam-in, hold 1.8s, exit: the whole show lasts this long. */
export const COMBO_BANNER_MS = 2600;
const TEXT = 'COMBO BREAKER!!';

/** "COMBO BREAKER!!" banner over the board, with jittering letters (Konami easter egg). */
@Component({
  selector: 'app-combo-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', '[attr.aria-label]': 'text' },
  template: `
    <div class="plate">
      <span class="text" aria-hidden="true">
        @for (letter of letters; track $index) {
          <span class="letter" [style.--i]="$index">{{ letter }}</span>
        }
      </span>
    </div>
  `,
  styleUrl: './combo-banner.scss',
})
export class ComboBanner {
  readonly done = output<void>();
  protected readonly text = TEXT;
  protected readonly letters = [...TEXT].map((c) => (c === ' ' ? ' ' : c));

  constructor() {
    const timer = setTimeout(() => this.done.emit(), COMBO_BANNER_MS);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
}
