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
import type { CellIndex, UnitRef } from '../../../engine';
import type { CellView } from '../../../core';
import type { RadialAnchor } from '../radial-picker/radial-picker';
import type { BoardOverlay } from '../hints/hint-view';

/** Hold time that turns a press into a long-press (opens the radial picker). */
export const LONG_PRESS_MS = 350;
const MOVE_TOLERANCE_PX = 10;

export interface CellMenuRequest {
  readonly cell: CellIndex;
  /** True for a long-press that is still held (release-to-commit). */
  readonly armed: boolean;
}

interface NoteSlot {
  /** 0 = empty slot. */
  readonly digit: number;
  /** Equals the selected cell's digit. */
  readonly hit: boolean;
  /** Removed by the open hint (shown even if the player has no such note). */
  readonly elim: boolean;
}

interface CellVm {
  readonly cell: CellView;
  readonly slots: readonly NoteSlot[];
  /** Digit the open hint places here (0 = none). */
  readonly ghost: number;
  readonly pattern: boolean;
  readonly mistake: boolean;
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
  /** Highlights of the open hint. */
  readonly overlay = input<BoardOverlay | null>(null);
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
    const overlay = this.overlay();
    const vms = this.cells().map((cell) => this.toVm(cell, hit, overlay));
    return Array.from({ length: 9 }, (_, r) => vms.slice(r * 9, r * 9 + 9));
  });

  /** Outlines of the hint's units, positioned in percent of the board. */
  protected readonly unitFrames = computed(() => (this.overlay()?.units ?? []).map(frame));

  /** Moves DOM focus to a cell (keyboard navigation keeps focus and selection together). */
  focusCell(index: CellIndex): void {
    this.host.nativeElement.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus();
  }

  /** Viewport geometry of a cell, to anchor the radial picker on it. */
  anchorOf(index: CellIndex, armed: boolean): RadialAnchor | null {
    const el = this.host.nativeElement.querySelector<HTMLElement>(`[data-index="${index}"]`);
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

  private toVm(cell: CellView, hit: number, overlay: BoardOverlay | null): CellVm {
    const position = { row: cell.row + 1, col: cell.col + 1, box: cell.box + 1 };
    const hint = {
      ghost: cell.value === 0 ? (overlay?.place.get(cell.index) ?? 0) : 0,
      pattern: overlay?.pattern.has(cell.index) ?? false,
      mistake: overlay?.mistake.has(cell.index) ?? false,
    };
    if (cell.value !== 0) {
      return {
        cell,
        ...hint,
        slots: [],
        labelKey: cell.given ? 'play.cell.given' : 'play.cell.filled',
        labelParams: { ...position, value: cell.value },
      };
    }
    const eliminated = overlay?.eliminate.get(cell.index) ?? 0;
    const shown = cell.notes | eliminated;
    const notes = digitsOf(cell.notes);
    return {
      cell,
      ...hint,
      slots: shown
        ? ALL_DIGITS.map((d) => ({
            digit: hasDigit(shown, d) ? d : 0,
            hit: d === hit && hasDigit(cell.notes, d),
            elim: hasDigit(eliminated, d),
          }))
        : [],
      labelKey: notes.length ? 'play.cell.notes' : 'play.cell.empty',
      labelParams: { ...position, notes: notes.join(' ') },
    };
  }
}

/** Percent rectangle of a row, column or box. */
function frame(unit: UnitRef): { top: number; left: number; width: number; height: number } {
  const ninth = 100 / 9;
  switch (unit.type) {
    case 'row':
      return { top: unit.index * ninth, left: 0, width: 100, height: ninth };
    case 'col':
      return { top: 0, left: unit.index * ninth, width: ninth, height: 100 };
    case 'box':
      return {
        top: Math.floor(unit.index / 3) * 3 * ninth,
        left: (unit.index % 3) * 3 * ninth,
        width: 3 * ninth,
        height: 3 * ninth,
      };
  }
}
