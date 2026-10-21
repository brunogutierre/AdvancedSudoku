import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../../../testing/i18n';
import homeEn from '../../../../public/i18n/home/en.json';
import { APP_STORAGE, GameStore, STORAGE_KEYS, emptyStats, withStart, withWin } from '../../core';
import type { GameState } from '../../core';
import { TODAY } from '../daily/week';
import { MemoryStorage } from '../../core/testing/memory-storage';
import { KNOWN_PUZZLES } from '../../engine/testing/fixtures';
import { Home, dayPart } from './home';

describe('Home', () => {
  async function setup(before?: () => void, storage = new MemoryStorage()) {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoTesting({ 'home/en': homeEn }),
        provideRouter([]),
        { provide: APP_STORAGE, useValue: storage },
        { provide: TODAY, useValue: '2026-10-21' },
      ],
    });
    before?.();
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

  it('hides the continue card without a game in progress', async () => {
    const { root } = await setup();
    expect(root.querySelector('app-continue-card')).toBeNull();
  });

  it('shows the saved game in a continue card linking to Play', async () => {
    const wiki = KNOWN_PUZZLES[0];
    const { root } = await setup(() => {
      const store = TestBed.inject(GameStore);
      store.newGame({ puzzle: wiki.puzzle, solution: wiki.solution, difficulty: 'hard' });
      store.pause();
    });
    const card = root.querySelector('app-continue-card')!;
    expect(root.querySelector('.grid')?.classList).toContain('has-continue');
    expect(card.querySelector('.chip')?.textContent?.trim()).toBe('Hard');
    expect(card.querySelector('.cells')?.textContent).toBe('30 of 81 cells');
    expect(card.querySelector('text')?.textContent).toBe('0%');
    expect(card.querySelector('.time')?.textContent).toBe('0:00');
    const link = card.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/play');
    expect(link.getAttribute('aria-label')).toBe('Continue your Hard game');
  });

  it('shows the daily tier, streak, quick stats and best times', async () => {
    const empty = await setup();
    expect(empty.root.querySelector('.daily .chip')?.textContent).toBe('Hard');
    expect(empty.root.querySelector('.daily .streak')?.textContent?.trim()).toBe('0-day streak');
    expect(empty.root.querySelectorAll('.tile dd')[2].textContent).toBe('–');
    expect(empty.cards[0].querySelector('.best')?.textContent?.trim()).toBe('No best time yet');
    TestBed.resetTestingModule();

    const grid = new Uint8Array(81);
    const won = (overrides: Partial<GameState>): GameState => ({
      puzzle: grid,
      solution: grid,
      values: grid,
      notes: new Uint16Array(81),
      selected: null,
      notesMode: false,
      difficulty: 'hard',
      mode: 'daily',
      dailyDate: '2026-10-21',
      seed: null,
      elapsedMs: 300_000,
      status: 'won',
      mistakes: 0,
      hintsUsed: 0,
      assisted: false,
      ...overrides,
    });
    let data = withStart(emptyStats(), 'hard');
    data = withWin(data, won({ dailyDate: '2026-10-20', elapsedMs: 400_000 }), new Date());
    data = withWin(data, won({}), new Date());
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.stats, JSON.stringify(data));
    const { root, cards } = await setup(undefined, storage);

    expect(root.querySelector('.daily .streak')?.classList).toContain('active');
    expect(root.querySelector('.daily .streak')?.textContent?.trim()).toBe('2-day streak');
    expect(root.querySelector('.daily .done')?.textContent?.trim()).toBe('Solved in 5:00');
    expect(root.querySelector('.daily a')).toBeNull();
    const tiles = Array.from(root.querySelectorAll('.tile')).map((t) => [
      t.querySelector('dt')?.textContent,
      t.querySelector('dd')?.textContent,
    ]);
    expect(tiles).toEqual([
      ['Games won', '2'],
      ['Best streak', '2'],
      ['Avg time', '5:50'],
    ]);
    expect(cards[2].querySelector('.best')?.textContent?.trim()).toBe('Best 5:00');
  });
});
