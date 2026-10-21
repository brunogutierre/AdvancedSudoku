import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';

export interface SegmentOption<T extends string> {
  readonly value: T;
  /** Already-translated label. */
  readonly label: string;
}

/**
 * Single-choice segmented control (ARIA radio group): one tab stop, arrows move and select.
 * Bind `[(value)]`.
 */
@Component({
  selector: 'app-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'radiogroup', '[attr.aria-label]': 'label()' },
  template: `
    @for (option of options(); track option.value; let i = $index) {
      <button
        type="button"
        role="radio"
        [attr.aria-checked]="option.value === value()"
        [attr.tabindex]="option.value === value() ? 0 : -1"
        (click)="value.set(option.value)"
        (keydown)="onKeydown($event, i)"
      >
        {{ option.label }}
      </button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      border-radius: var(--r-md);
      background: var(--surface-2);
    }
    button {
      min-height: 38px;
      padding: 0 var(--sp-3);
      border: 0;
      border-radius: var(--r-sm);
      background: transparent;
      color: var(--text-muted);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      transition:
        background-color var(--dur-2) var(--ease-out),
        color var(--dur-2) var(--ease-out);
    }
    button[aria-checked='true'] {
      background: var(--surface);
      color: var(--text);
      font-weight: var(--fw-semibold);
      box-shadow: var(--shadow-1);
    }
    @media (forced-colors: active) {
      button[aria-checked='true'] {
        outline: 2px solid Highlight;
      }
    }
  `,
})
export class Segmented<T extends string> {
  readonly label = input.required<string>();
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly value = model.required<T>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const count = this.options().length;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const next = (index + step + count) % count;
    this.value.set(this.options()[next].value);
    this.host.nativeElement.querySelectorAll<HTMLButtonElement>('[role=radio]')[next]?.focus();
  }
}
