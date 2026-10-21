import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoHttpLoader } from './transloco-http.loader';

describe('TranslocoHttpLoader', () => {
  it('requests root and scoped dictionaries relative to the base href', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const loader = TestBed.inject(TranslocoHttpLoader);
    const http = TestBed.inject(HttpTestingController);
    let root: unknown;
    let scoped: unknown;

    loader.getTranslation('pt-BR').subscribe((t) => (root = t));
    loader.getTranslation('home/fr').subscribe((t) => (scoped = t));
    http.expectOne('i18n/pt-BR.json').flush({ a: 1 });
    http.expectOne('i18n/home/fr.json').flush({ b: 2 });

    expect(root).toEqual({ a: 1 });
    expect(scoped).toEqual({ b: 2 });
    http.verify();
  });
});
