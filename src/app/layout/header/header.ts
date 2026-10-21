import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { LanguageService } from '../../core/i18n/language.service';
import { LANGS, LANG_LABELS, Lang } from '../../core/i18n/languages';
import { NAV_ITEMS, injectCurrentPath, isActivePath } from '../../core/navigation/current-path';
import { revealThemeChange } from '../../core/theme/theme-transition';
import { THEME_MODES, ThemeMode, ThemeService } from '../../core/theme/theme.service';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { Menu, MenuItem } from '../../shared/ui/menu/menu';

const THEME_ICONS = { system: 'contrast', light: 'sun', dark: 'moon' } as const;

@Component({
  selector: 'app-header',
  imports: [RouterLink, TranslocoPipe, Button, Icon, Menu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.scrolled]': 'scrolled()',
    '[class.on-play]': 'onPlay()',
    '(window:scroll)': 'onScroll()',
  },
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);
  private readonly theme = inject(ThemeService);
  private readonly language = inject(LanguageService);
  private readonly themeMenu = viewChild.required('themeMenu', { read: ElementRef });

  protected readonly nav = NAV_ITEMS;
  protected readonly path = injectCurrentPath();
  protected readonly onPlay = computed(() => this.path().startsWith('/play'));
  protected readonly scrolled = signal(false);

  protected readonly lang = this.language.lang;
  protected readonly langLabel = computed(() => LANG_LABELS[this.lang()]);
  protected readonly langItems: readonly MenuItem<Lang>[] = LANGS.map((lang) => ({
    value: lang,
    label: LANG_LABELS[lang].name,
    lang,
  }));

  protected readonly themeMode = this.theme.mode;
  protected readonly themeIcon = computed(() => THEME_ICONS[this.themeMode()]);
  // selectTranslateObject re-emits once the dictionary of a newly selected language loads.
  private readonly themeLabels = toSignal(
    this.transloco.selectTranslateObject<Partial<Record<ThemeMode, string>>>('theme'),
    { initialValue: {} as Partial<Record<ThemeMode, string>> },
  );
  protected readonly themeItems = computed<readonly MenuItem<ThemeMode>[]>(() =>
    THEME_MODES.map((mode) => ({ value: mode, label: this.themeLabels()[mode] ?? mode })),
  );

  protected isActive(itemPath: string): boolean {
    return isActivePath(itemPath, this.path());
  }

  protected setLang(lang: Lang): void {
    this.language.setLang(lang);
  }

  /** Reveals the new theme from the center of the theme button. */
  protected setTheme(mode: ThemeMode): void {
    const rect = (this.themeMenu().nativeElement as HTMLElement).getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    revealThemeChange(this.document, origin, () => this.theme.setMode(mode));
  }

  protected onScroll(): void {
    this.scrolled.set((this.document.defaultView?.scrollY ?? 0) > 0);
  }
}
