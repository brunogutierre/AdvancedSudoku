import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/i18n';
import hintsEn from '../../../../../public/i18n/hints/en.json';
import hintsEs from '../../../../../public/i18n/hints/es.json';
import { TranslocoService } from '@jsverse/transloco';
import type { Step } from '../../../engine';
import { HintPanel } from './hint-panel';

const xWing: Step = {
  technique: 'xWing',
  placements: [],
  eliminations: [{ cell: 10, digit: 5 }],
  highlights: { cells: [10, 15, 46, 51], units: [], digits: [5] },
  explainKey: 'technique.xWing.explain',
  params: {
    digit: 5,
    baseUnit: 'row',
    baseIndices: '2, 6',
    coverUnit: 'col',
    coverIndices: '2, 7',
  },
};

const single: Step = {
  technique: 'hiddenSingle',
  placements: [{ cell: 70, digit: 4 }],
  eliminations: [],
  highlights: { cells: [70], units: [{ type: 'box', index: 8 }], digits: [4] },
  explainKey: 'technique.hiddenSingle.explain',
  params: { cell: 'R8C8', digit: 4, unit: 'box', unitIndex: 9 },
};

const mistake: Step = {
  technique: 'mistake',
  placements: [],
  eliminations: [],
  highlights: { cells: [2], units: [], digits: [] },
  explainKey: 'technique.mistake.wrongValue',
  params: { cell: 'R1C3' },
};

@Component({
  imports: [HintPanel],
  template: `<app-hint-panel
    [step]="step()"
    [number]="2"
    (apply)="applied.set($event)"
    (closed)="closed.set(closed() + 1)"
  />`,
})
class Host {
  readonly step = signal<Step | null>(xWing);
  readonly applied = signal<Step | null>(null);
  readonly closed = signal(0);
}

describe('HintPanel', () => {
  function setup(step: Step | null) {
    TestBed.configureTestingModule({
      providers: [provideTranslocoTesting({ 'hints/en': hintsEn, 'hints/es': hintsEs })],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.step.set(step);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const panel = root.querySelector<HTMLElement>('app-hint-panel')!;
    const buttons = () => Array.from(panel.querySelectorAll<HTMLButtonElement>('footer button'));
    return { fixture, panel, buttons, host: fixture.componentInstance };
  }

  it('explains a technique with its level, legend and localized unit phrases', () => {
    const { panel, buttons, host } = setup(xWing);
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-label')).toBe('Hint');
    expect(panel.querySelector('.eyebrow')?.textContent).toBe('Hint 2');
    expect(panel.querySelector('.name')?.textContent).toBe('X-Wing');
    expect(panel.querySelector('.chip')?.textContent).toBe('Hard');
    expect(panel.querySelector('.explain')?.textContent).toBe(
      'X-Wing on 5: in rows 2, 6, it can only go in columns 2, 7, so it can be removed from the rest of columns 2, 7.',
    );
    expect(panel.querySelector('[aria-live=polite]')).not.toBeNull();
    expect(panel.querySelectorAll('.legend li').length).toBe(1);

    buttons()[1].click();
    expect(host.applied()).toBe(xWing);
    buttons()[0].click();
    expect(host.closed()).toBe(1);
  });

  it('follows the active language', () => {
    const { fixture, panel } = setup(single);
    expect(panel.querySelector('.explain')?.textContent).toBe(
      '4 fits in only one cell in box 9: R8C8.',
    );
    TestBed.inject(TranslocoService).setActiveLang('es');
    fixture.detectChanges();
    expect(panel.querySelector('.name')?.textContent).toBe('Único oculto');
    expect(panel.querySelector('.explain')?.textContent).toBe(
      'El 4 solo cabe en una casilla en la caja 9: R8C8.',
    );
  });

  it('points at a mistake instead of applying a technique', () => {
    const { panel, buttons } = setup(mistake);
    expect(panel.querySelector('.chip')?.textContent).toBe('Mistake');
    expect(panel.querySelector('.explain')?.textContent).toBe('The digit in R1C3 is not correct.');
    expect(panel.querySelector('.legend')).toBeNull();
    expect(buttons()[1].textContent?.trim()).toBe('Show cell');
  });

  it('shows a loading state, closes with Escape and the close icon', () => {
    const { panel, buttons, host } = setup(null);
    expect(panel.querySelector('[role=status]')?.textContent).toContain(
      'Looking for the next step',
    );
    expect(buttons()[1].disabled).toBe(true);
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    panel.querySelector<HTMLButtonElement>('.close')!.click();
    expect(host.closed()).toBe(2);
  });
});
