import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button, ButtonVariant } from './button';

@Component({
  imports: [Button],
  template: `<button app-button [variant]="variant()" [loading]="loading()">Go</button>`,
})
class Host {
  readonly variant = signal<ButtonVariant>('primary');
  readonly loading = signal(false);
}

describe('Button', () => {
  it('reflects the variant and loading state on the native button', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.dataset['variant']).toBe('primary');
    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.querySelector('.spinner')).toBeNull();
    expect(button.textContent?.trim()).toBe('Go');

    fixture.componentInstance.variant.set('ghost');
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    expect(button.dataset['variant']).toBe('ghost');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.classList).toContain('loading');
    expect(button.querySelector('.spinner')).not.toBeNull();
  });
});
