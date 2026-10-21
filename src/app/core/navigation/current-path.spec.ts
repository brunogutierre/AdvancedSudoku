import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { injectCurrentPath, isActivePath, pathOf } from './current-path';

@Component({ template: '' })
class Blank {}

describe('current path', () => {
  it('strips query and fragment', () => {
    expect(pathOf('/play?difficulty=easy')).toBe('/play');
    expect(pathOf('/stats#top')).toBe('/stats');
    expect(pathOf('')).toBe('/');
  });

  it('matches home exactly and other sections by prefix', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/', '/play')).toBe(false);
    expect(isActivePath('/play', '/play')).toBe(true);
  });

  it('tracks navigation', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    const path = TestBed.runInInjectionContext(() => injectCurrentPath());
    expect(path()).toBe('/');
    await TestBed.inject(Router).navigateByUrl('/daily?x=1');
    expect(path()).toBe('/daily');
  });
});
