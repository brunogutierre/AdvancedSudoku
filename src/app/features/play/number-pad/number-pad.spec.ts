import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/i18n';
import playEn from '../../../../../public/i18n/play/en.json';
import { NumberPad } from './number-pad';

@Component({
  imports: [NumberPad],
  template: `<app-number-pad
    label="Number pad"
    [counts]="counts()"
    [notesMode]="notes()"
    (digit)="last.set($event)"
  />`,
})
class Host {
  readonly counts = signal([0, 9, 3, 0, 0, 0, 0, 0, 0, 1]);
  readonly notes = signal(false);
  readonly last = signal<number | null>(null);
}

describe('NumberPad', () => {
  it('shows remaining counts, dims completed digits and emits digits', () => {
    TestBed.configureTestingModule({ providers: [provideTranslocoTesting({ 'play/en': playEn })] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const pad = root.querySelector('app-number-pad')!;
    const keys = Array.from(pad.querySelectorAll<HTMLButtonElement>('button'));

    expect(pad.getAttribute('aria-label')).toBe('Number pad');
    expect(keys.length).toBe(9);
    expect(keys[0].getAttribute('aria-label')).toBe('1, complete');
    expect(keys[0].getAttribute('aria-disabled')).toBe('true');
    expect(keys[0].querySelector('app-icon')).not.toBeNull();
    expect(keys[1].getAttribute('aria-label')).toBe('2, 6 left');
    expect(keys[1].querySelector('.badge')?.textContent?.trim()).toBe('6');

    keys[4].click();
    expect(fixture.componentInstance.last()).toBe(5);

    fixture.componentInstance.notes.set(true);
    fixture.detectChanges();
    expect(pad.classList).toContain('notes');
  });
});
