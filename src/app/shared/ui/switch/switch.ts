import { ChangeDetectionStrategy, Component, model } from '@angular/core';

/**
 * On/off toggle on a native button (`role="switch"`). Name it with `aria-labelledby` or
 * `aria-label`; bind `[(checked)]`.
 */
@Component({
  selector: 'button[app-switch]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    role: 'switch',
    '[attr.aria-checked]': 'checked()',
    '(click)': 'checked.set(!checked())',
  },
  template: `<span class="thumb" aria-hidden="true"></span>`,
  styles: `
    :host {
      position: relative;
      flex: none;
      width: 44px;
      height: 26px;
      padding: 0;
      border: 0;
      border-radius: var(--r-full);
      background: var(--border-strong);
      transition: background-color var(--dur-2) var(--ease-out);
    }
    :host([aria-checked='true']) {
      background: var(--primary);
    }
    .thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--surface);
      box-shadow: var(--shadow-1);
      transition: transform var(--dur-3) var(--ease-spring);
    }
    :host([aria-checked='true']) .thumb {
      transform: translateX(18px);
    }
    @media (forced-colors: active) {
      :host {
        border: 1px solid ButtonText;
      }
      .thumb {
        background: ButtonText;
      }
    }
  `,
})
export class Switch {
  readonly checked = model(false);
}
