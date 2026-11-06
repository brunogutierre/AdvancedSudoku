import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../testing/i18n';
import { LanguageService } from '../../core/i18n/language.service';
import { APP_BANNER_KEY, AppBanner } from './app-banner';

describe('AppBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en']);
    TestBed.configureTestingModule({ providers: [provideTranslocoTesting()] });
  });
  afterEach(() => vi.restoreAllMocks());

  async function setup() {
    const fixture = TestBed.createComponent(AppBanner);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('links to the Android app page in the player’s language', async () => {
    const { fixture, root } = await setup();
    expect(root.querySelector('p')?.textContent).toContain(
      'Advanced Sudoku is now an Android app.',
    );
    const link = root.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('https://altcozygames.com/en/sudoku');
    expect(link.getAttribute('rel')).toBe('noopener');

    TestBed.inject(LanguageService).setLang('pt-BR');
    await fixture.whenStable();
    expect(link.getAttribute('href')).toBe('https://altcozygames.com/pt/sudoku');
  });

  it('closes for good', async () => {
    const { root } = await setup();
    root.querySelector<HTMLButtonElement>('.close')!.click();
    expect(localStorage.getItem(APP_BANNER_KEY)).toBe('closed');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideTranslocoTesting()] });
    const again = await setup();
    expect(again.root.querySelector('.banner')).toBeNull();
  });
});
