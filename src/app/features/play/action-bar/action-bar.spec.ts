import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/i18n';
import playEn from '../../../../../public/i18n/play/en.json';
import { ActionBar, PlayAction } from './action-bar';

@Component({
  imports: [ActionBar],
  template: `<app-action-bar
    label="Game actions"
    [canUndo]="canUndo()"
    [canRedo]="false"
    [notesMode]="notes()"
    (action)="last.set($event)"
  />`,
})
class Host {
  readonly canUndo = signal(true);
  readonly notes = signal(false);
  readonly last = signal<PlayAction | null>(null);
}

describe('ActionBar', () => {
  it('emits actions, reflects availability and the notes toggle', () => {
    TestBed.configureTestingModule({ providers: [provideTranslocoTesting({ 'play/en': playEn })] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('app-action-bar')!;
    const [undo, redo, erase, notes, hint] = Array.from(bar.querySelectorAll('button'));

    expect(bar.getAttribute('role')).toBe('toolbar');
    expect(undo.textContent?.trim()).toBe('Undo');
    expect(redo.disabled).toBe(true);
    expect(hint.disabled).toBe(true);
    expect(notes.getAttribute('aria-pressed')).toBe('false');

    undo.click();
    expect(fixture.componentInstance.last()).toBe('undo');
    erase.click();
    expect(fixture.componentInstance.last()).toBe('erase');
    notes.click();
    expect(fixture.componentInstance.last()).toBe('notes');

    fixture.componentInstance.notes.set(true);
    fixture.detectChanges();
    expect(notes.getAttribute('aria-pressed')).toBe('true');
    expect(notes.querySelector('.pill')?.textContent).toBe('On');
  });
});
