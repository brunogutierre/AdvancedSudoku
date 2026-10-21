import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../testing/i18n';
import settingsEn from '../../../../public/i18n/settings/en.json';
import { APP_STORAGE, SettingsStore } from '../../core';
import { MemoryStorage } from '../../core/testing/memory-storage';
import { Settings } from './settings';

describe('Settings', () => {
  async function setup(vibrate?: () => boolean) {
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoTesting({ 'settings/en': settingsEn }),
        { provide: APP_STORAGE, useValue: new MemoryStorage() },
      ],
    });
    const fixture = TestBed.createComponent(Settings);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return {
      fixture,
      root: fixture.nativeElement as HTMLElement,
      store: TestBed.inject(SettingsStore),
    };
  }

  afterEach(() => {
    delete (navigator as { vibrate?: unknown }).vibrate;
  });

  it('renders every preference group and control', async () => {
    const { root } = await setup(() => true);
    expect(root.querySelector('h1')?.textContent).toBe('Settings');
    expect(Array.from(root.querySelectorAll('h2')).map((h) => h.textContent)).toEqual([
      'Gameplay',
      'Assistance',
      'Feedback',
      'Appearance',
      'Language',
    ]);
    expect(root.querySelectorAll('[role=switch]').length).toBe(5);
    expect(root.querySelectorAll('[role=radiogroup]').length).toBe(3);
    expect(root.querySelector('option[value="pt-BR"]')?.textContent?.trim()).toBe(
      'Português (Brasil)',
    );
  });

  it('hides haptics without the Vibration API', async () => {
    const { root } = await setup();
    expect(root.querySelector('[data-setting="haptics"]')).toBeNull();
  });

  it('writes changes to SettingsStore and restores defaults', async () => {
    const { root, store, fixture } = await setup(() => true);
    root.querySelector<HTMLButtonElement>('[data-setting="sound"]')!.click();
    expect(store.sound()).toBe(true);

    const solution = Array.from(root.querySelectorAll<HTMLButtonElement>('[role=radio]')).find(
      (r) => r.textContent?.trim() === 'Solution',
    )!;
    solution.click();
    expect(store.mistakeMode()).toBe('solution');

    const select = root.querySelector('select')!;
    select.value = 'fr';
    select.dispatchEvent(new Event('change'));
    expect(store.lang()).toBe('fr');

    root.querySelector<HTMLButtonElement>('.reset')!.click();
    await fixture.whenStable();
    expect(store.sound()).toBe(false);
    expect(store.mistakeMode()).toBe('conflicts');
  });
});
