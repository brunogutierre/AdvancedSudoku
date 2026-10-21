import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../testing/i18n';
import { ToastService } from '../../core/toast/toast.service';
import { ToastOutlet } from './toast-outlet';

describe('ToastOutlet', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideTranslocoTesting()] });
    const fixture = TestBed.createComponent(ToastOutlet);
    const service = TestBed.inject(ToastService);
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, service, host };
  }

  it('is a polite live region rendering queued toasts', () => {
    const { fixture, service, host } = setup();
    service.show({ message: 'Saved', persistent: true });
    fixture.detectChanges();
    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-live')).toBe('polite');
    expect(host.querySelector('p')?.textContent).toBe('Saved');
    expect(host.querySelector('.dismiss')?.getAttribute('aria-label')).toBe('Dismiss');
  });

  it('runs the action then dismisses, and dismisses from the close button', () => {
    const { fixture, service, host } = setup();
    const run = vi.fn();
    service.show({ message: 'Update', persistent: true, action: { label: 'Reload', run } });
    service.show({ message: 'Other', persistent: true });
    fixture.detectChanges();

    host.querySelector<HTMLButtonElement>('.action')!.click();
    expect(run).toHaveBeenCalledOnce();
    expect(service.toasts().map((t) => t.message)).toEqual(['Other']);

    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.dismiss')!.click();
    expect(service.toasts()).toEqual([]);
  });
});
