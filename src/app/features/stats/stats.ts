import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';

/** Placeholder: the stats feature PR fills this page. */
@Component({
  selector: 'app-stats',
  imports: [TranslocoPipe],
  providers: [provideTranslocoScope('stats')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="display page-title">{{ 'stats.title' | transloco }}</h1>
    </section>
  `,
})
export class Stats {}
