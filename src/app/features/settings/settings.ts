import { ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';
import { SettingsStore } from '../../core';
import type { Settings as SettingsModel } from '../../core';
import { LANGS, LANG_LABELS } from '../../core/i18n/languages';
import { Button } from '../../shared/ui/button/button';
import { Segmented } from '../../shared/ui/segmented/segmented';
import { Switch } from '../../shared/ui/switch/switch';

/** Every SettingsStore preference, grouped in cards; changes apply and persist immediately. */
@Component({
  selector: 'app-settings',
  imports: [TranslocoPipe, Button, Segmented, Switch],
  providers: [provideTranslocoScope('settings')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  protected readonly store = inject(SettingsStore);
  protected readonly langs = LANGS.map((lang) => ({ value: lang, ...LANG_LABELS[lang] }));
  /** Haptics are only offered where the Vibration API exists (not on iOS or desktops). */
  protected readonly canVibrate =
    typeof inject(DOCUMENT).defaultView?.navigator?.vibrate === 'function';

  /** Untyped values from the template are validated by SettingsStore (invalid ones are ignored). */
  protected change(key: keyof SettingsModel, value: unknown): void {
    this.store.update({ [key]: value } as Partial<SettingsModel>);
  }
}
