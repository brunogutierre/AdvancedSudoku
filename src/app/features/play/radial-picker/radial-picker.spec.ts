import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/i18n';
import pickerEn from '../../../../../public/i18n/picker/en.json';
import { APP_STORAGE, GameStore } from '../../../core';
import { MemoryStorage } from '../../../core/testing/memory-storage';
import { KNOWN_PUZZLES } from '../../../engine/testing/fixtures';
import { RadialAnchor, RadialPicker } from './radial-picker';

const wiki = KNOWN_PUZZLES[0];
/** R1C3: empty, solution 4; 5, 3 and 7 are already in its row. */
const CELL = 2;

@Component({
  imports: [RadialPicker],
  template: `@if (open()) {
    <app-radial-picker [anchor]="anchor()" (closed)="open.set(false)" />
  }`,
})
class Host {
  readonly open = signal(true);
  readonly anchor = signal<RadialAnchor>({ cell: CELL, x: 20, y: 700, size: 40, armed: false });
}

describe('RadialPicker', () => {
  async function setup(anchor?: Partial<RadialAnchor>) {
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoTesting({ 'picker/en': pickerEn }),
        { provide: APP_STORAGE, useValue: new MemoryStorage() },
      ],
    });
    const store = TestBed.inject(GameStore);
    store.newGame({ puzzle: wiki.puzzle, solution: wiki.solution, difficulty: 'medium' });
    const fixture = TestBed.createComponent(Host);
    if (anchor) {
      fixture.componentInstance.anchor.update((a) => ({ ...a, ...anchor }));
    }
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const bubble = (d: number) => root.querySelector<HTMLButtonElement>(`[data-digit="${d}"]`)!;
    const key = async (init: KeyboardEventInit) => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, ...init }),
      );
      await fixture.whenStable();
    };
    return { fixture, root, store, bubble, key, host: fixture.componentInstance };
  }

  it('lays out 9 menu items on a ring, kept inside the viewport, and focuses the first', async () => {
    const { root, bubble } = await setup();
    const picker = root.querySelector('app-radial-picker')!;
    expect(picker.getAttribute('role')).toBe('menu');
    expect(root.querySelectorAll('.bubble').length).toBe(9);
    expect(bubble(1).getAttribute('role')).toBe('menuitemradio');
    expect(bubble(1).style.getPropertyValue('--x')).toBe('0px');
    expect(bubble(1).style.getPropertyValue('--y')).toBe('-76px');
    const ring = root.querySelector<HTMLElement>('.ring')!;
    expect(ring.style.left).toBe('106px');
    expect(root.querySelector('.extras')?.classList).toContain('above');
    expect(bubble(5).classList).toContain('blocked');
    expect(document.activeElement).toBe(bubble(1));
  });

  it('places a value and closes', async () => {
    const { store, bubble, host } = await setup();
    bubble(4).click();
    expect(store.cells()[CELL].value).toBe(4);
    expect(store.selected()).toBe(CELL);
    expect(host.open()).toBe(false);
  });

  it('toggles notes and stays open in notes mode', async () => {
    const { fixture, root, store, bubble, host } = await setup();
    const [, notesMode] = Array.from(root.querySelectorAll<HTMLButtonElement>('.modes button'));
    notesMode.click();
    await fixture.whenStable();
    expect(bubble(1).getAttribute('role')).toBe('menuitemcheckbox');
    bubble(1).click();
    bubble(4).click();
    await fixture.whenStable();
    expect(store.cells()[CELL].notes).toBe(0b1001);
    expect(bubble(4).getAttribute('aria-checked')).toBe('true');
    expect(host.open()).toBe(true);
  });

  it('clears the cell from the hub and fills candidates', async () => {
    const { fixture, root, store, host } = await setup();
    store.select(CELL);
    store.input(4);
    root.querySelector<HTMLButtonElement>('.hub')!.click();
    expect(store.cells()[CELL].value).toBe(0);
    expect(host.open()).toBe(false);

    host.open.set(true);
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.fill')!.click();
    expect(store.cells()[CELL].notes).not.toBe(0);
  });

  it('is keyboard navigable: arrows, digits, N, Esc', async () => {
    const { store, bubble, key, host, fixture } = await setup();
    await key({ key: 'ArrowRight' });
    expect(document.activeElement).toBe(bubble(2));
    await key({ key: 'ArrowLeft' });
    await key({ key: 'ArrowLeft' });
    expect(document.activeElement?.textContent?.trim()).toBe('Notes');
    await key({ code: 'KeyN', key: 'n' });
    await key({ code: 'Digit2', key: '2' });
    expect(store.cells()[CELL].notes).toBe(0b10);
    await key({ key: 'q' });
    await key({ key: 'Escape' });
    expect(host.open()).toBe(false);

    host.open.set(true);
    await fixture.whenStable();
    await key({ code: 'Digit4', key: '4' });
    expect(store.cells()[CELL].value).toBe(4);
  });

  it('closes on outside pointerdown, not inside', async () => {
    const { bubble, host } = await setup();
    bubble(3).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(host.open()).toBe(true);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(host.open()).toBe(false);
  });

  it('commits the bubble under the first release after a long-press', async () => {
    const { store, bubble } = await setup({ armed: true });
    document.elementFromPoint = vi.fn(() => bubble(4));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 1, clientY: 1 }));
    expect(store.cells()[CELL].value).toBe(4);
    delete (document as Partial<Document>).elementFromPoint;
  });

  it('ignores a release that is not over a bubble', async () => {
    const { store, host } = await setup({ armed: true });
    document.dispatchEvent(new PointerEvent('pointerup'));
    document.dispatchEvent(new PointerEvent('pointerup'));
    expect(store.cells()[CELL].value).toBe(0);
    expect(host.open()).toBe(true);
  });
});
