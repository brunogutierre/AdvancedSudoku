import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { injectCurrentPath } from './core/navigation/current-path';
import { Header } from './layout/header/header';
import { TabBar } from './layout/tab-bar/tab-bar';
import { ToastOutlet } from './layout/toast-outlet/toast-outlet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslocoPipe, Header, TabBar, ToastOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.with-tab-bar]': 'showTabBar()' },
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly path = injectCurrentPath();
  /** The board gets the whole screen on Play: no bottom tab bar there. */
  protected readonly showTabBar = computed(() => !this.path().startsWith('/play'));

  /**
   * In-page link without a URL change: with a non-root <base href>, `href="#main"` would
   * resolve against the base and reload the app.
   */
  protected skipToMain(event: Event, main: HTMLElement): void {
    event.preventDefault();
    main.focus();
  }
}
