import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Surface container: `--surface`, large radius, soft layered shadow. */
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'surface-outline', '[attr.data-elevation]': 'elevation()' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: block;
      padding: var(--sp-5);
      border-radius: var(--r-xl);
      background: var(--surface);
      box-shadow: var(--shadow-1);
    }
    :host([data-elevation='2']) {
      box-shadow: var(--shadow-2);
    }
    :host([data-elevation='3']) {
      box-shadow: var(--shadow-3);
    }
  `,
})
export class Card {
  readonly elevation = input<1 | 2 | 3>(1);
}
