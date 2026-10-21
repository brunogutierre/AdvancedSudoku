import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Menu, MenuItem } from './menu';

type Fruit = 'apple' | 'pear' | 'plum';

@Component({
  imports: [Menu],
  template: `
    <app-menu label="Fruit" [items]="items" [value]="value()" (selected)="value.set($event)">
      Pick
    </app-menu>
    <p class="outside">outside</p>
  `,
})
class Host {
  readonly items: MenuItem<Fruit>[] = [
    { value: 'apple', label: 'Apple' },
    { value: 'pear', label: 'Pear', lang: 'fr' },
    { value: 'plum', label: 'Plum' },
  ];
  readonly value = signal<Fruit>('pear');
}

describe('Menu', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>('.trigger')!;
    const items = () =>
      Array.from(root.querySelectorAll<HTMLButtonElement>('[role=menuitemradio]'));
    const press = async (key: string) => {
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
      await fixture.whenStable();
    };
    return { fixture, root, trigger, items, press };
  }

  it('opens on the checked item and exposes radio semantics', async () => {
    const { fixture, trigger, items } = await setup();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(items().map((i) => i.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(items()[1].getAttribute('lang')).toBe('fr');
    expect(document.activeElement).toBe(items()[1]);
  });

  it('moves with arrows, Home and End, and selects with click', async () => {
    const { fixture, trigger, items, press } = await setup();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await fixture.whenStable();

    await press('ArrowDown');
    expect(document.activeElement).toBe(items()[2]);
    await press('ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    await press('ArrowUp');
    expect(document.activeElement).toBe(items()[2]);
    await press('Home');
    expect(document.activeElement).toBe(items()[0]);
    await press('End');
    expect(document.activeElement).toBe(items()[2]);

    items()[2].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('plum');
    expect(items()).toEqual([]);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes with Escape, Tab, a second trigger click or an outside click', async () => {
    const { fixture, root, trigger, items, press } = await setup();
    const open = async () => {
      trigger.click();
      await fixture.whenStable();
    };

    await open();
    await press('Escape');
    expect(items()).toEqual([]);
    expect(document.activeElement).toBe(trigger);

    await open();
    await press('Tab');
    expect(items()).toEqual([]);

    await open();
    await open();
    expect(items()).toEqual([]);

    await open();
    root.querySelector<HTMLElement>('.outside')!.click();
    await fixture.whenStable();
    expect(items()).toEqual([]);
  });

  it('does not emit when re-selecting the current value', async () => {
    const { fixture, trigger, items } = await setup();
    const spy = vi.spyOn(fixture.componentInstance.value, 'set');
    trigger.click();
    await fixture.whenStable();
    items()[1].click();
    expect(spy).not.toHaveBeenCalled();
  });
});
