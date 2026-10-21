import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';

/** Placeholder: the settings feature PR fills this page. */
@Component({
  selector: 'app-settings',
  imports: [TranslocoPipe],
  providers: [provideTranslocoScope('settings')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="display page-title">{{ 'settings.title' | transloco }}</h1>
    </section>
  `,
})
export class Settings {}
