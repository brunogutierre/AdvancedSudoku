import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

let nextId = 0;

/**
 * Modal built on the native `<dialog>` (focus trap, Esc, top layer and inert background for
 * free). Two-way bind `[(open)]`; Esc, the close button and a backdrop click all close it.
 */
@Component({
  selector: 'app-dialog',
  imports: [Button, Icon, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
})
export class Dialog {
  readonly open = model(false);
  readonly heading = input.required<string>();

  protected readonly titleId = `app-dialog-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) {
        el.showModal();
      } else if (!this.open() && el.open) {
        el.close();
      }
    });
  }

  close(): void {
    this.open.set(false);
  }

  protected onNativeClose(): void {
    this.open.set(false);
  }

  /** Clicks on the dialog element itself (not its content) land on the backdrop. */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
