import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/i18n';
import playEn from '../../../../../public/i18n/play/en.json';
import type { CellView } from '../../../core';
import { cellViews } from '../../../core/game/game-selectors';
import { maskOf, parseGrid } from '../../../engine';
import { KNOWN_PUZZLES } from '../../../engine/testing/fixtures';
import { Board } from './board';
import { navigate } from './board-nav';

const wiki = KNOWN_PUZZLES[0];

function views(selected: number | null, edit?: (values: Uint8Array, notes: Uint16Array) => void) {
  const puzzle = parseGrid(wiki.puzzle);
  const values = new Uint8Array(puzzle);
  const notes = new Uint16Array(81);
  edit?.(values, notes);
  return cellViews(
    { puzzle, solution: parseGrid(wiki.solution), values, notes, selected },
    { mistakeMode: 'conflicts', highlightPeers: true, highlightSameDigit: true },
  );
}

@Component({
  imports: [Board],
  template: `<app-board
    [cells]="cells()"
    label="Sudoku board, Easy"
    [concealed]="concealed()"
    (cellSelect)="picked.set($event)"
  />`,
})
class Host {
  readonly cells = signal<readonly CellView[]>(views(null));
  readonly concealed = signal(false);
  readonly picked = signal<number | null>(null);
  readonly board = viewChild.required(Board);
}

describe('Board', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideTranslocoTesting({ 'play/en': playEn })] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const cell = (i: number) => root.querySelector<HTMLElement>(`[data-index="${i}"]`)!;
    return { fixture, root, cell, host: fixture.componentInstance };
  }

  it('renders an ARIA grid of 9 rows x 9 cells with a single tab stop', () => {
    const { root, cell } = setup();
    const grid = root.querySelector('[role=grid]')!;
    expect(grid.getAttribute('aria-label')).toBe('Sudoku board, Easy');
    expect(grid.querySelectorAll('[role=row]').length).toBe(9);
    expect(grid.querySelectorAll('[role=gridcell]').length).toBe(81);
    expect(grid.querySelectorAll('[tabindex="0"]').length).toBe(1);
    expect(cell(0).tabIndex).toBe(0);
  });

  it('labels givens, user digits, empty cells, notes and conflicts', () => {
    const { fixture, host, cell } = setup();
    expect(cell(0).getAttribute('aria-label')).toBe('Row 1, column 1, box 1, given 5');
    expect(cell(0).getAttribute('aria-readonly')).toBe('true');
    expect(cell(2).getAttribute('aria-label')).toBe('Row 1, column 3, box 1, empty');

    host.cells.set(
      views(2, (values, notes) => {
        values[3] = 5; // conflicts with the given 5 in R1C1
        notes[2] = maskOf([1, 4, 7]);
        notes[11] = maskOf([2, 5]);
      }),
    );
    fixture.detectChanges();
    expect(cell(2).getAttribute('aria-label')).toBe('Row 1, column 3, box 1, empty, notes 1 4 7');
    expect(cell(2).getAttribute('aria-selected')).toBe('true');
    expect(cell(2).tabIndex).toBe(0);
    expect(cell(2).querySelectorAll('.notes span').length).toBe(9);
    expect(cell(3).getAttribute('aria-label')).toBe('Row 1, column 4, box 2, 5, conflict');
    expect(cell(3).getAttribute('aria-invalid')).toBe('true');
    expect(cell(3).classList).toContain('conflict');
    expect(cell(1).classList).toContain('peer');
  });

  it('highlights notes matching the selected digit', () => {
    const { fixture, host, cell } = setup();
    host.cells.set(views(0, (_, notes) => (notes[2] = maskOf([5, 6]))));
    fixture.detectChanges();
    const hits = Array.from(cell(2).querySelectorAll('.hit')).map((n) => n.textContent);
    expect(hits).toEqual(['5']);
  });

  it('renders no digits while concealed', () => {
    const { fixture, host, root } = setup();
    host.concealed.set(true);
    fixture.detectChanges();
    expect(root.querySelector('.digit')).toBeNull();
    expect(root.querySelector('[role=grid]')?.classList).toContain('concealed');
  });

  it('selects on click, Enter and focus, and moves focus on request', () => {
    const { fixture, host, cell } = setup();
    cell(10).click();
    expect(host.picked()).toBe(10);
    cell(11).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(host.picked()).toBe(11);
    cell(12).dispatchEvent(new FocusEvent('focus'));
    expect(host.picked()).toBe(12);

    host.cells.set(views(12));
    fixture.detectChanges();
    host.board().focusCell(20);
    expect(document.activeElement).toBe(cell(20));
    expect(host.board().hasFocus()).toBe(true);
  });
});

describe('navigate', () => {
  it.each([
    [null, 'ArrowDown', false, 0],
    [40, 'ArrowUp', false, 31],
    [40, 'ArrowDown', false, 49],
    [40, 'ArrowLeft', false, 39],
    [40, 'ArrowRight', false, 41],
    [0, 'ArrowUp', false, 0],
    [0, 'ArrowLeft', false, 0],
    [80, 'ArrowDown', false, 80],
    [80, 'ArrowRight', false, 80],
    [40, 'Home', false, 36],
    [40, 'End', false, 44],
    [40, 'Home', true, 0],
    [40, 'End', true, 80],
    [40, 'a', false, null],
  ])('from %s with %s (ctrl %s) → %s', (from, key, ctrl, to) => {
    expect(navigate(from, key, ctrl)).toBe(to);
  });
});
