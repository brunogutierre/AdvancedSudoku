import {
  EnvironmentProviders,
  inject,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { UpdateService } from './update.service';

/**
 * Offline support: the Angular service worker (production builds only) caches the app shell,
 * fonts, dictionaries and puzzle bank; UpdateService offers new versions politely.
 * The worker path is relative, so it registers under the deployed base href.
 */
export function providePwa(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => inject(UpdateService).start()),
  ]);
}
