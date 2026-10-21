import { TestBed } from '@angular/core/testing';
import { Card } from './card';

describe('Card', () => {
  it('exposes its elevation for styling', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.componentRef.setInput('elevation', 3);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).dataset['elevation']).toBe('3');
  });
});
