import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { StatsStore } from './core';
import type { GameState } from './core';
import { provideI18n } from './core/i18n/provide-i18n';
import { GAME_WON_HANDLERS } from './features/play/game-events';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({ skipInitialTransition: true }),
    ),
    provideI18n(),
    {
      provide: GAME_WON_HANDLERS,
      multi: true,
      useFactory: () => {
        const stats = inject(StatsStore);
        return (game: GameState) => stats.recordWin(game);
      },
    },
  ],
};
