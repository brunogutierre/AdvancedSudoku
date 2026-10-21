import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';
import { ICONS } from './icons';

describe('Icon', () => {
  it('renders every path of the named icon, hidden from assistive tech', () => {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', 'erase');
    fixture.componentRef.setInput('size', 24);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const svg = host.querySelector('svg');

    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('width')).toBe('24');
    expect(svg?.querySelectorAll('path').length).toBe(ICONS.erase.length);
  });

  it('builds closed circle paths', () => {
    expect(ICONS.sun[0]).toBe('M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0');
  });
});
