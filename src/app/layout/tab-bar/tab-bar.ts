import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { NAV_ITEMS, injectCurrentPath, isActivePath } from '../../core/navigation/current-path';
import { Icon } from '../../shared/ui/icon/icon';

/** Bottom tab bar for narrow screens (< 900px); the header nav takes over above that. */
@Component({
  selector: 'app-tab-bar',
  imports: [RouterLink, TranslocoPipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav [attr.aria-label]="'nav.label' | transloco">
      <ul role="list">
        @for (item of nav; track item.path) {
          <li>
            <a [routerLink]="item.path" [attr.aria-current]="isActive(item.path) ? 'page' : null">
              <app-icon [name]="item.icon" [size]="24" />
              <span>{{ item.labelKey | transloco }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styleUrl: './tab-bar.scss',
})
export class TabBar {
  protected readonly nav = NAV_ITEMS;
  private readonly path = injectCurrentPath();

  protected isActive(itemPath: string): boolean {
    return isActivePath(itemPath, this.path());
  }
}
