import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageService } from '../../core/i18n/language.service';
import type { Lang } from '../../core/i18n/languages';
import { APP_STORAGE } from '../../core/persistence/persistence.service';
import { Icon } from '../../shared/ui/icon/icon';

/** Remembers that the player closed the banner. */
export const APP_BANNER_KEY = 'advsudoku:v1:appBanner';

/** The studio site's language codes, in the app page's address. */
const SITE_LANGS: Readonly<Record<Lang, string>> = { en: 'en', 'pt-BR': 'pt', es: 'es', fr: 'fr' };

/**
 * Advanced Sudoku grew into an Android app: a slim banner on top links to its page on
 * altcozygames.com, in the player's language. Closed once, it stays closed.
 */
@Component({
  selector: 'app-app-banner',
  imports: [TranslocoPipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shown()) {
      <aside class="banner" [attr.aria-label]="'appBanner.label' | transloco">
        <p>
          {{ 'appBanner.text' | transloco }}
          <a [href]="link()" target="_blank" rel="noopener">{{ 'appBanner.link' | transloco }}</a>
        </p>
        <button
          type="button"
          class="close"
          [attr.aria-label]="'appBanner.close' | transloco"
          (click)="close()"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </aside>
    }
  `,
  styleUrl: './app-banner.scss',
})
export class AppBanner {
  private readonly storage = inject(APP_STORAGE);
  private readonly lang = inject(LanguageService).lang;
  protected readonly shown = signal(this.read() !== 'closed');
  protected readonly link = computed(
    () => `https://altcozygames.com/${SITE_LANGS[this.lang()] ?? 'en'}/sudoku`,
  );

  protected close(): void {
    this.shown.set(false);
    try {
      this.storage?.setItem(APP_BANNER_KEY, 'closed');
    } catch {
      // Storage blocked: it comes back next visit, which is fine.
    }
  }

  private read(): string | null {
    try {
      return this.storage?.getItem(APP_BANNER_KEY) ?? null;
    } catch {
      return null;
    }
  }
}
