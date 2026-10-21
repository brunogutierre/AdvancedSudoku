import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../../../testing/i18n';
import { TabBar } from './tab-bar';

@Component({ template: '' })
class Blank {}

describe('TabBar', () => {
  it('lists the four destinations and marks the current one', async () => {
    TestBed.configureTestingModule({
      providers: [provideTranslocoTesting(), provideRouter([{ path: '**', component: Blank }])],
    });
    await TestBed.inject(Router).navigateByUrl('/daily');
    const fixture = TestBed.createComponent(TabBar);
    fixture.detectChanges();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));

    expect(links.map((a) => a.textContent?.trim())).toEqual(['Home', 'Play', 'Daily', 'Stats']);
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual([null, null, 'page', null]);
  });
});
