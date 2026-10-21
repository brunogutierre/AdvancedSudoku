import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../../../../testing/i18n';
import completionEn from '../../../../../public/i18n/completion/en.json';
import { Completion } from './completion';
import { Confetti } from './confetti';

@Component({
  imports: [Completion],
  template: `<app-completion
    difficulty="hard"
    [elapsedMs]="125000"
    [mistakes]="2"
    [hintsUsed]="1"
    [personalBest]="best()"
    (newGame)="again.set(true)"
  />`,
})
class Host {
  readonly best = signal(false);
  readonly again = signal(false);
}

describe('Completion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideTranslocoTesting({ 'completion/en': completionEn }), provideRouter([])],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('rises after the win wave with time, stats, actions and confetti', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const dialog = root.querySelector('dialog')!;
    expect(dialog.hasAttribute('open')).toBe(false);

    vi.advanceTimersByTime(700);
    fixture.detectChanges();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(root.querySelector('h2')?.textContent).toBe('Solved.');
    expect(root.querySelector('.time')?.textContent?.trim()).toBe('2:05');
    expect(Array.from(root.querySelectorAll('dd')).map((d) => d.textContent?.trim())).toEqual([
      '2',
      '1',
      'Hard',
    ]);
    expect(root.querySelector('.badge')).toBeNull();

    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);

    root.querySelector<HTMLButtonElement>('.actions button')!.click();
    expect(fixture.componentInstance.again()).toBe(true);
    expect(root.querySelector('.actions a')?.getAttribute('href')).toBe('/');

    fixture.componentInstance.best.set(true);
    fixture.detectChanges();
    expect(root.querySelector('.badge')?.textContent).toContain('New best');
  });
});

describe('Confetti', () => {
  it('finishes immediately without a 2D canvas (jsdom) or under reduced motion', async () => {
    const fixture = TestBed.createComponent(Confetti);
    const done = vi.fn();
    fixture.componentInstance.done.subscribe(done);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(done).toHaveBeenCalled();
  });

  it('animates pieces on a canvas and stops after the burst', async () => {
    const ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      globalAlpha: 1,
      fillStyle: '',
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
    vi.spyOn(performance, 'now').mockReturnValue(0);
    document.documentElement.dataset['motion'] = 'full';

    const fixture = TestBed.createComponent(Confetti);
    fixture.componentRef.setInput('count', 6);
    const done = vi.fn();
    fixture.componentInstance.done.subscribe(done);
    fixture.detectChanges();
    await fixture.whenStable();

    const flush = (time: number) => frames.splice(0).forEach((frame) => frame(time));
    flush(16);
    expect(ctx.fillRect).toHaveBeenCalledTimes(4);
    expect(ctx.arc).toHaveBeenCalledTimes(2);
    flush(2000);
    expect(done).toHaveBeenCalled();
    delete document.documentElement.dataset['motion'];
    vi.restoreAllMocks();
  });
});
