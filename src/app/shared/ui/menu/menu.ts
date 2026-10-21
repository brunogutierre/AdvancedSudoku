import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import { Icon } from '../icon/icon';

export interface MenuItem<T extends string> {
  readonly value: T;
  /** Already-translated label. */
  readonly label: string;
  /** Language of the label when it differs from the page (endonyms). */
  readonly lang?: string;
}

let nextId = 0;

/**
 * Menu button with single-choice (radio) items, following the ARIA menu button pattern:
 * Enter/Space/ArrowDown open it on the checked item, arrows/Home/End move, Esc closes and
 * returns focus, Tab or an outside click closes it.
 */
@Component({
  selector: 'app-menu',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'onDocumentClick($event)' },
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu<T extends string> {
  readonly label = input.required<string>();
  readonly items = input.required<readonly MenuItem<T>[]>();
  readonly value = input.required<T>();
  readonly selected = output<T>();

  protected readonly open = signal(false);
  protected readonly menuId = `app-menu-${nextId++}`;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected toggle(): void {
    if (this.open()) {
      this.close(false);
    } else {
      this.show();
    }
  }

  protected show(): void {
    this.open.set(true);
    afterNextRender(() => this.focusItem(this.checkedIndex()), { injector: this.injector });
  }

  protected choose(item: MenuItem<T>): void {
    this.close(true);
    if (item.value !== this.value()) {
      this.selected.emit(item.value);
    }
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    const count = this.items().length;
    const current = this.itemButtons().indexOf(event.target as HTMLButtonElement);
    const moves: Record<string, number> = {
      ArrowDown: (current + 1) % count,
      ArrowUp: (current - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      this.focusItem(moves[event.key]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
    } else if (event.key === 'Tab') {
      this.close(false);
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }

  private close(restoreFocus: boolean): void {
    this.open.set(false);
    if (restoreFocus) {
      this.host.nativeElement.querySelector<HTMLButtonElement>('.trigger')?.focus();
    }
  }

  private checkedIndex(): number {
    return Math.max(
      0,
      this.items().findIndex((item) => item.value === this.value()),
    );
  }

  private itemButtons(): HTMLButtonElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll('[role^="menuitem"]'));
  }

  private focusItem(index: number): void {
    this.itemButtons()[index]?.focus();
  }
}
