import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Switch } from './switch';

@Component({
  imports: [Switch],
  template: `<button app-switch aria-label="Sound" [(checked)]="on"></button>`,
})
class Host {
  readonly on = signal(false);
}

describe('Switch', () => {
  it('is a native button with switch semantics that toggles its model', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-checked')).toBe('false');

    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');
  });
});
