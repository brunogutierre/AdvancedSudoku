import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../../../testing/i18n';
import homeEn from '../../../../public/i18n/home/en.json';
import { Home, dayPart } from './home';

describe('Home', () => {
  async function setup() {
    localStorage.clear();
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en']);
    TestBed.configureTestingModule({
      providers: [provideTranslocoTesting({ 'home/en': homeEn }), provideRouter([])],
    });
    const fixture = TestBed.createComponent(Home);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const cards = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.difficulty'));
    return { fixture, root, cards };
  }

  afterEach(() => vi.restoreAllMocks());

  it.each([
    [4, 'evening'],
    [5, 'morning'],
    [12, 'afternoon'],
    [18, 'evening'],
  ])('greets by time of day (%i h → %s)', (hour, part) => {
    expect(dayPart(hour)).toBe(part);
  });

  it('renders the hero, daily card and four difficulty cards linking to Play', async () => {
    const { root, cards } = await setup();
    expect(root.querySelector('h1')?.textContent).toMatch(/^Good (morning|afternoon|evening)\.$/);
    expect(root.querySelector('.daily a')?.getAttribute('href')).toBe('/daily');
    expect(cards.map((c) => c.getAttribute('href'))).toEqual([
      '/play?difficulty=easy',
      '/play?difficulty=medium',
      '/play?difficulty=hard',
      '/play?difficulty=insane',
    ]);
    expect(cards[3].getAttribute('aria-label')).toBe('New Insane game');
    expect(cards.map((c) => c.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it('moves focus between cards with a roving tabindex', async () => {
    const { cards } = await setup();
    const press = (from: number, key: string) =>
      cards[from].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    press(0, 'ArrowRight');
    expect(document.activeElement).toBe(cards[1]);
    expect(cards.map((c) => c.tabIndex)).toEqual([-1, 0, -1, -1]);
    press(1, 'ArrowUp');
    expect(document.activeElement).toBe(cards[0]);
    press(0, 'ArrowLeft');
    expect(document.activeElement).toBe(cards[3]);
    press(3, 'Home');
    expect(document.activeElement).toBe(cards[0]);
    press(0, 'End');
    expect(document.activeElement).toBe(cards[3]);
    press(3, 'ArrowDown');
    expect(document.activeElement).toBe(cards[0]);
    press(0, 'a');
    expect(document.activeElement).toBe(cards[0]);
  });
});
