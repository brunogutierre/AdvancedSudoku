import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** Path of the current URL without query or fragment, e.g. `/play`. */
export function pathOf(url: string): string {
  return url.split(/[?#]/)[0] || '/';
}

/** Current router path as a signal (call in an injection context). */
export function injectCurrentPath(): Signal<string> {
  const router = inject(Router);
  return toSignal(
    router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => pathOf(event.urlAfterRedirects)),
    ),
    { initialValue: pathOf(router.url) },
  );
}

export interface NavItem {
  readonly path: string;
  readonly labelKey: string;
  readonly icon: 'home' | 'play' | 'calendar' | 'chart';
}

/** Primary destinations shared by the header nav and the mobile tab bar. */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', labelKey: 'nav.home', icon: 'home' },
  { path: '/play', labelKey: 'nav.play', icon: 'play' },
  { path: '/daily', labelKey: 'nav.daily', icon: 'calendar' },
  { path: '/stats', labelKey: 'nav.stats', icon: 'chart' },
];

export function isActivePath(itemPath: string, current: string): boolean {
  return itemPath === '/' ? current === '/' : current.startsWith(itemPath);
}
