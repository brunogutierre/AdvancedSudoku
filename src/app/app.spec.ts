import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../testing/i18n';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideTranslocoTesting(), provideRouter(routes)],
    });
  });

  async function setup(url: string) {
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(App);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('renders the shell landmarks, skip link and tab bar', async () => {
    const { root } = await setup('/');
    expect(root.querySelector('app-header')).not.toBeNull();
    expect(root.querySelector('main#main')).not.toBeNull();
    expect(root.querySelector('app-tab-bar')).not.toBeNull();
    expect(root.querySelector('app-toast-outlet')).not.toBeNull();
    expect(root.querySelector('.skip-link')?.textContent?.trim()).toBe('Skip to content');
  });

  it('hides the tab bar on Play', async () => {
    const { root } = await setup('/play?difficulty=easy');
    expect(root.querySelector('app-tab-bar')).toBeNull();
    expect(root.querySelector('app-play')).not.toBeNull();
  });

  it('moves focus to main from the skip link without navigating', async () => {
    const { root } = await setup('/');
    const link = root.querySelector<HTMLAnchorElement>('.skip-link')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('main'));
  });

  it('redirects unknown URLs home', async () => {
    await setup('/nope');
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
