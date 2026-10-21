import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject, combineLatest, of, switchMap } from 'rxjs';

/**
 * Route `title`s are translation keys. The document title is "Page · Advanced Sudoku"
 * (or just the app name) and is re-rendered whenever the language changes.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private readonly key$ = new BehaviorSubject<string | undefined>(undefined);

  constructor() {
    super();
    this.key$
      .pipe(
        switchMap((key) =>
          combineLatest([
            this.transloco.selectTranslate<string>('app.name'),
            key ? this.transloco.selectTranslate<string>(key) : of(undefined),
          ]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(([app, page]) => this.title.setTitle(page ? `${page} · ${app}` : app));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key$.next(this.buildTitle(snapshot));
  }
}
