import { Routes } from '@angular/router';

/** Every page is lazy; `title` values are translation keys (see TranslatedTitleStrategy). */
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  {
    path: 'play',
    title: 'nav.play',
    loadComponent: () => import('./features/play/play').then((m) => m.Play),
  },
  {
    path: 'daily',
    title: 'nav.daily',
    loadComponent: () => import('./features/daily/daily').then((m) => m.Daily),
  },
  {
    path: 'stats',
    title: 'nav.stats',
    loadComponent: () => import('./features/stats/stats').then((m) => m.Stats),
  },
  {
    path: 'settings',
    title: 'nav.settings',
    loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
  },
  { path: '**', redirectTo: '' },
];
