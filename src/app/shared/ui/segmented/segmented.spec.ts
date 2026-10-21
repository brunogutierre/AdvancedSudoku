import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Segmented, SegmentOption } from './segmented';

type Mode = 'a' | 'b' | 'c';

@Component({
  imports: [Segmented],
  template: `<app-segmented label="Mode" [options]="options" [(value)]="value" />`,
})
class Host {
  readonly options: SegmentOption<Mode>[] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
  ];
  readonly value = signal<Mode>('b');
}

describe('Segmented', () => {
  it('is a radio group with one tab stop, selectable by click and arrows', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const group = root.querySelector('app-segmented')!;
    const radios = () => Array.from(root.querySelectorAll<HTMLButtonElement>('[role=radio]'));
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Mode');
    expect(radios().map((r) => r.tabIndex)).toEqual([-1, 0, -1]);

    radios()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('a');

    radios()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('c');
    expect(document.activeElement).toBe(radios()[2]);

    radios()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(fixture.componentInstance.value()).toBe('a');
    radios()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    expect(fixture.componentInstance.value()).toBe('a');
  });
});
