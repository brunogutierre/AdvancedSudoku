import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';

/**
 * Styles a native `<button>` or `<a>` (keeps native semantics and keyboard behavior).
 * `loading` hides the label behind a spinner while keeping the button's width.
 */
@Component({
  selector: 'button[app-button], a[app-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-variant]': 'variant()',
    '[attr.aria-busy]': 'loading() || null',
    '[class.loading]': 'loading()',
  },
  template: `
    <span class="label"><ng-content /></span>
    @if (loading()) {
      <span class="spinner" aria-hidden="true"></span>
    }
  `,
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly loading = input(false);
}
