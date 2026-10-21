import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../../../testing/i18n';
import { LanguageService } from '../../core/i18n/language.service';
import { ThemeService } from '../../core/theme/theme.service';
import { Header } from './header';

@Component({ template: '' })
class Blank {}

describe('Header', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en']);
    TestBed.configureTestingModule({
      providers: [provideTranslocoTesting(), provideRouter([{ path: '**', component: Blank }])],
    });
  });
  afterEach(() => vi.restoreAllMocks());

  async function setup(url = '/') {
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(Header);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const triggers = root.querySelectorAll<HTMLButtonElement>('.trigger');
    return { fixture, root, langTrigger: triggers[0], themeTrigger: triggers[1] };
  }

  async function pick(
    fixture: Awaited<ReturnType<typeof setup>>['fixture'],
    trigger: HTMLButtonElement,
    label: string,
  ) {
    trigger.click();
    await fixture.whenStable();
    const items = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '[role=menuitemradio]',
      ),
    );
    items.find((item) => item.textContent?.trim() === label)!.click();
    await fixture.whenStable();
  }

  it('renders the wordmark and marks the active nav tab', async () => {
    const { root } = await setup('/stats');
    expect(root.querySelector('.wordmark')?.getAttribute('aria-label')).toBe('Advanced Sudoku');
    const current = root.querySelector('nav a[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('Stats');
    expect(current?.querySelector('.indicator')).not.toBeNull();
    expect(root.querySelector('.back')).toBeNull();
  });

  it('shows a back link on Play', async () => {
    const { root } = await setup('/play?difficulty=hard');
    expect(root.querySelector('.back')?.getAttribute('aria-label')).toBe('Back');
  });

  it('switches the language from the menu with native names', async () => {
    const { fixture, langTrigger } = await setup();
    expect(langTrigger.getAttribute('aria-label')).toBe('Language: English');
    expect(langTrigger.textContent).toContain('EN');

    await pick(fixture, langTrigger, 'Español');
    expect(TestBed.inject(LanguageService).lang()).toBe('es');
    expect(langTrigger.textContent).toContain('ES');
  });

  it('switches the theme from the menu', async () => {
    const { fixture, themeTrigger } = await setup();
    expect(themeTrigger.getAttribute('aria-label')).toBe('Theme: System');

    await pick(fixture, themeTrigger, 'Dark');
    expect(TestBed.inject(ThemeService).mode()).toBe('dark');
    expect(themeTrigger.getAttribute('aria-label')).toBe('Theme: Dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    TestBed.inject(ThemeService).setMode('system');
  });

  it('shows the hairline border only once the page scrolls', async () => {
    const { fixture, root } = await setup();
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(40);
    window.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(root.classList).toContain('scrolled');
  });
});
