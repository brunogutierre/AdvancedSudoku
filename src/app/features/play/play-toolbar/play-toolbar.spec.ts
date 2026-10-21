import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/i18n';
import playEn from '../../../../../public/i18n/play/en.json';
import { PlayToolbar } from './play-toolbar';

@Component({
  imports: [PlayToolbar],
  template: `<app-play-toolbar
    difficulty="hard"
    [elapsedMs]="elapsed()"
    [mistakes]="2"
    [showMistakes]="mistakes()"
    [paused]="paused()"
    (togglePause)="toggles.set(toggles() + 1)"
  />`,
})
class Host {
  readonly elapsed = signal(65_000);
  readonly mistakes = signal(false);
  readonly paused = signal(false);
  readonly toggles = signal(0);
}

describe('PlayToolbar', () => {
  it('shows difficulty, time, optional mistakes and a pause toggle', () => {
    TestBed.configureTestingModule({ providers: [provideTranslocoTesting({ 'play/en': playEn })] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const pause = root.querySelector<HTMLButtonElement>('.pause')!;

    expect(root.querySelector('.chip')?.textContent?.trim()).toBe('Hard');
    expect(root.querySelector('.timer')?.textContent?.trim()).toBe('1:05');
    expect(root.querySelector('.mistakes')).toBeNull();
    expect(pause.getAttribute('aria-label')).toBe('Pause');

    pause.click();
    expect(fixture.componentInstance.toggles()).toBe(1);

    fixture.componentInstance.mistakes.set(true);
    fixture.componentInstance.paused.set(true);
    fixture.detectChanges();
    expect(root.querySelector('.mistakes')?.textContent?.trim()).toBe('Mistakes: 2');
    expect(root.querySelector('.timer')?.textContent?.trim()).toBe('Paused');
    expect(pause.getAttribute('aria-label')).toBe('Resume');
  });
});
