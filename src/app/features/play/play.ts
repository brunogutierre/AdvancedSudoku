import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe, provideTranslocoScope } from '@jsverse/transloco';

/** Placeholder: the play feature PR fills this page. */
@Component({
  selector: 'app-play',
  imports: [TranslocoPipe],
  providers: [provideTranslocoScope('play')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="display page-title">{{ 'play.title' | transloco }}</h1>
    </section>
  `,
})
export class Play {}
