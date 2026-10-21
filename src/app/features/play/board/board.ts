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
import type { RadialAnchor } from '../radial-picker/radial-picker';
import { MotionKind, animateCells } from './board-motion';

/** Hold time that turns a press into a long-press (opens the radial picker). */
export const LONG_PRESS_MS = 350;
const MOVE_TOLERANCE_PX = 10;

export interface CellMenuRequest {
  readonly cell: CellIndex;
  /** True for a long-press that is still held (release-to-commit). */
  readonly armed: boolean;
}

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
  /** Long-press or right-click on a cell: open the radial picker there. */
  readonly cellMenu = output<CellMenuRequest>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private press: { timer: ReturnType<typeof setTimeout>; x: number; y: number } | null = null;
  private longPressed = false;

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
    this.cellElement(index)?.focus();
  }

  /** Plays a micro-animation on cells (callers check reduced motion). */
  animate(kind: MotionKind, cells: readonly CellIndex[]): void {
    animateCells((cell) => this.cellElement(cell), kind, cells);
  }

  private cellElement(index: CellIndex): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(`[data-index="${index}"]`);
  }

  /** Viewport geometry of a cell, to anchor the radial picker on it. */
  anchorOf(index: CellIndex, armed: boolean): RadialAnchor | null {
    const el = this.cellElement(index);
    if (!el) {
      return null;
    }
    const rect = el.getBoundingClientRect();
    return {
      cell: index,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: rect.width,
      armed,
    };
  }

  protected onPointerDown(event: PointerEvent, cell: CellIndex): void {
    this.cancelPress();
    this.longPressed = false;
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    const timer = setTimeout(() => {
      this.press = null;
      this.longPressed = true;
      this.cellMenu.emit({ cell, armed: true });
    }, LONG_PRESS_MS);
    this.press = { timer, x: event.clientX, y: event.clientY };
  }

  protected onPointerMove(event: PointerEvent): void {
    if (
      this.press &&
      Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y) > MOVE_TOLERANCE_PX
    ) {
      this.cancelPress();
    }
  }

  protected cancelPress(): void {
    if (this.press) {
      clearTimeout(this.press.timer);
      this.press = null;
    }
  }

  /** Right-click, or the context menu some phones fire after our own long-press. */
  protected onContextMenu(event: MouseEvent, cell: CellIndex): void {
    event.preventDefault();
    this.cancelPress();
    if (this.longPressed) {
      this.longPressed = false;
      return;
    }
    this.cellMenu.emit({ cell, armed: false });
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
