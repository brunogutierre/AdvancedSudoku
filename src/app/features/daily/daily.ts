import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';

/** Placeholder: the daily feature PR fills this page. */
@Component({
  selector: 'app-daily',
  imports: [TranslocoPipe],
  providers: [provideTranslocoScope('daily')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="display page-title">{{ 'daily.title' | transloco }}</h1>
    </section>
  `,
})
export class Daily {}
