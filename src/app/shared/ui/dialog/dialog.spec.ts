import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/i18n';
import { Dialog } from './dialog';

@Component({
  imports: [Dialog],
  template: `
    <app-dialog heading="Solved." [(open)]="open">
      <p class="content">Body</p>
      <button dialog-actions type="button">OK</button>
    </app-dialog>
  `,
})
class Host {
  readonly open = signal(false);
}

describe('Dialog', () => {
  const proto = HTMLDialogElement.prototype;

  beforeEach(() => {
    // jsdom has no <dialog> behavior: emulate the open state and the close event.
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
    TestBed.configureTestingModule({ providers: [provideTranslocoTesting()] });
  });

  afterEach(() => {
    delete (proto as Partial<HTMLDialogElement>).showModal;
    delete (proto as Partial<HTMLDialogElement>).close;
  });

  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    return { fixture, dialog };
  }

  it('opens modally, labels itself with the heading and projects content', () => {
    const { fixture, dialog } = setup();
    expect(dialog.open).toBe(false);

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    expect(dialog.open).toBe(true);
    const title = dialog.querySelector('h2')!;
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent).toBe('Solved.');
    expect(dialog.querySelector('.content')).not.toBeNull();
    expect(dialog.querySelector('footer button')?.textContent).toBe('OK');
  });

  it('closes from the close button and syncs the model', () => {
    const { fixture, dialog } = setup();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    dialog.querySelector<HTMLButtonElement>('header button')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(dialog.open).toBe(false);
  });

  it('closes on backdrop clicks and native close (Esc), not on content clicks', () => {
    const { fixture, dialog } = setup();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    dialog.querySelector<HTMLElement>('.content')!.click();
    expect(fixture.componentInstance.open()).toBe(true);

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.open()).toBe(false);
    fixture.detectChanges();
    expect(dialog.open).toBe(false);

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    dialog.dispatchEvent(new Event('close'));
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
