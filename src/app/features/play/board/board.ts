import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ALL_DIGITS, digitsOf, hasDigit } from '../../../engine';
import type { CellIndex } from '../../../engine';
import type { CellView } from '../../../core';

interface CellVm {
  readonly cell: CellView;
  /** Digit shown in each of the 9 note slots (0 = empty slot). */
  readonly slots: readonly number[];
  readonly labelKey: string;
  readonly labelParams: Readonly<Record<string, string | number>>;
}

/**
 * The 9x9 board as an ARIA grid with a roving tabindex. It only renders cells and reports
 * selection; keyboard commands are handled by the Play page, which calls `focusCell`.
 */
@Component({
  selector: 'app-board',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  readonly cells = input.required<readonly CellView[]>();
  /** Accessible name, e.g. "Sudoku board, Hard". */
  readonly label = input.required<string>();
  /** Paused: render no digits at all (not just blurred). */
  readonly concealed = input(false);
  /** Paused or won: no pointer input. */
  readonly locked = input(false);
  readonly cellSelect = output<CellIndex>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly selectedValue = computed(
    () => this.cells().find((cell) => cell.selected)?.value ?? 0,
  );

  /** The cell that takes part in the tab sequence: the selection, else R1C1. */
  protected readonly tabStop = computed(
    () => this.cells().find((cell) => cell.selected)?.index ?? 0,
  );

  protected readonly rows = computed<readonly (readonly CellVm[])[]>(() => {
    const hit = this.selectedValue();
    const vms = this.cells().map((cell) => this.toVm(cell, hit));
    return Array.from({ length: 9 }, (_, r) => vms.slice(r * 9, r * 9 + 9));
  });

  /** Moves DOM focus to a cell (keyboard navigation keeps focus and selection together). */
  focusCell(index: CellIndex): void {
    this.host.nativeElement.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus();
  }

  /** True when DOM focus is on one of the cells. */
  hasFocus(): boolean {
    return this.host.nativeElement.contains(this.host.nativeElement.ownerDocument.activeElement);
  }

  protected onFocus(cell: CellView): void {
    if (!cell.selected) {
      this.cellSelect.emit(cell.index);
    }
  }

  private toVm(cell: CellView, hit: number): CellVm {
    const position = { row: cell.row + 1, col: cell.col + 1, box: cell.box + 1 };
    const slots = ALL_DIGITS.map((d) => (hasDigit(cell.notes, d) ? d : 0));
    if (cell.value !== 0) {
      return {
        cell,
        slots,
        labelKey: cell.given ? 'play.cell.given' : 'play.cell.filled',
        labelParams: { ...position, value: cell.value },
      };
    }
    const notes = digitsOf(cell.notes);
    return {
      cell,
      slots: slots.map((d) => (d !== 0 && d === hit ? -d : d)),
      labelKey: notes.length ? 'play.cell.notes' : 'play.cell.empty',
      labelParams: { ...position, notes: notes.join(' ') },
    };
  }
}
