import { TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('sizes itself from inputs and stays hidden from assistive tech', () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.componentRef.setInput('width', '120px');
    fixture.componentRef.setInput('height', '2rem');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.style.width).toBe('120px');
    expect(host.style.height).toBe('2rem');
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });
});
