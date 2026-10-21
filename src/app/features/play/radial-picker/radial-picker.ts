import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';
import { GameStore } from '../../../core';
import { ALL_DIGITS, cellCandidates, hasDigit } from '../../../engine';
import type { CellIndex, Digit } from '../../../engine';
import { Icon } from '../../../shared/ui/icon/icon';

/** Where to open the picker: the cell and its center / size in viewport pixels. */
export interface RadialAnchor {
  readonly cell: CellIndex;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** Opened by a long-press that is still held: releasing over a bubble commits it. */
  readonly armed: boolean;
}

export type PickerMode = 'value' | 'notes';

const BUBBLE = 44;
const MARGIN = 8;
/** Room needed under the ring for the fill / mode controls. */
const EXTRAS = 104;

/**
 * Marking-menu style digit picker: 9 bubbles on a ring around the cell (1 at 12 o'clock,
 * clockwise), a "clear" hub, "fill candidates" and a Value | Notes switch. Works with tap,
 * long-press-drag-release, and keyboard (arrows, 1-9, N, Enter, Esc).
 */
@Component({
  selector: 'app-radial-picker',
  imports: [TranslocoPipe, Icon],
  providers: [provideTranslocoScope('picker')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'menu',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:pointerup)': 'onDocumentPointerUp($event)',
  },
  templateUrl: './radial-picker.html',
  styleUrl: './radial-picker.scss',
})
export class RadialPicker {
  readonly anchor = input.required<RadialAnchor>();
  readonly closed = output<void>();

  private readonly store = inject(GameStore);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private armed = true;

  protected readonly mode = signal<PickerMode>(this.store.notesMode() ? 'notes' : 'value');

  protected readonly geometry = computed(() => {
    const { x, y, size } = this.anchor();
    const view = this.document.defaultView;
    const width = view?.innerWidth ?? 1024;
    const height = view?.innerHeight ?? 768;
    const diameter = Math.min(260, Math.max(196, 3.4 * size));
    const half = diameter / 2 + MARGIN;
    const cx = clamp(x, half, width - half);
    const cy = clamp(y, half, height - half);
    return {
      cx,
      cy,
      diameter,
      radius: diameter / 2 - BUBBLE / 2,
      below: cy + diameter / 2 + EXTRAS < height,
    };
  });

  protected readonly bubbles = computed(() => {
    const cell = this.anchor().cell;
    const view = this.store.cells()[cell];
    const counts = this.store.digitCounts();
    const candidates = cellCandidates(this.store.state().values, cell);
    const { radius } = this.geometry();
    const notes = this.mode() === 'notes';
    return ALL_DIGITS.map((digit, i) => {
      const angle = ((i * 40 - 90) * Math.PI) / 180;
      return {
        digit,
        x: Math.round(radius * Math.cos(angle)),
        y: Math.round(radius * Math.sin(angle)),
        active: notes ? hasDigit(view.notes, digit) : view.value === digit,
        done: counts[digit] >= 9 && view.value !== digit,
        blocked: view.value !== digit && !hasDigit(candidates, digit),
      };
    });
  });

  constructor() {
    const injector = inject(Injector);
    afterNextRender(
      () => {
        const ring = this.host.nativeElement;
        const current = ring.querySelector<HTMLElement>('.bubble[aria-checked="true"]');
        (current ?? ring.querySelector<HTMLElement>('.bubble'))?.focus();
      },
      { injector },
    );
  }

  protected pick(digit: Digit): void {
    this.store.select(this.anchor().cell);
    if (this.mode() === 'notes') {
      this.store.input(digit, { note: true });
      return;
    }
    this.store.input(digit, { note: false });
    this.close();
  }

  protected clear(): void {
    this.store.select(this.anchor().cell);
    this.store.erase();
    this.close();
  }

  protected fill(): void {
    this.store.autoCandidates();
    this.close();
  }

  protected setMode(mode: PickerMode): void {
    this.mode.set(mode);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const items = this.items();
    const index = items.indexOf(event.target as HTMLElement);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
    if (step !== undefined) {
      items[(index + step + items.length) % items.length]?.focus();
    } else if (digit) {
      this.pick(Number(digit[1]) as Digit);
    } else if (event.code === 'KeyN') {
      this.mode.update((mode) => (mode === 'notes' ? 'value' : 'notes'));
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      this.close();
    } else {
      return;
    }
    event.preventDefault();
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  /** Marking-menu release: the first release after a long-press commits the bubble under it. */
  protected onDocumentPointerUp(event: PointerEvent): void {
    if (!this.anchor().armed || !this.armed) {
      return;
    }
    this.armed = false;
    const target = this.document.elementFromPoint?.(event.clientX, event.clientY);
    const bubble = target?.closest<HTMLElement>('[data-digit]');
    if (bubble && this.host.nativeElement.contains(bubble)) {
      this.pick(Number(bubble.dataset['digit']) as Digit);
    }
  }

  private close(): void {
    this.closed.emit();
  }

  private items(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll('[role^="menuitem"]'));
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
