import { prefersReducedMotion, revealThemeChange } from './theme-transition';

interface FakeDoc {
  documentElement: HTMLElement;
  defaultView: {
    innerWidth: number;
    innerHeight: number;
    matchMedia: (q: string) => { matches: boolean };
  };
  startViewTransition?: (cb: () => void) => unknown;
}

function fakeDoc(reduced = false): FakeDoc {
  return {
    documentElement: document.createElement('html'),
    defaultView: { innerWidth: 400, innerHeight: 300, matchMedia: () => ({ matches: reduced }) },
  };
}

describe('theme transition', () => {
  it('reads reduced motion from the data attribute first, then the media query', () => {
    const doc = fakeDoc(true);
    expect(prefersReducedMotion(doc as unknown as Document)).toBe(true);
    doc.documentElement.dataset['motion'] = 'full';
    expect(prefersReducedMotion(doc as unknown as Document)).toBe(false);
    doc.documentElement.dataset['motion'] = 'reduced';
    expect(prefersReducedMotion(fakeDoc(false) as unknown as Document)).toBe(false);
    expect(prefersReducedMotion(doc as unknown as Document)).toBe(true);
  });

  it('applies immediately without View Transitions', () => {
    const apply = vi.fn();
    revealThemeChange(fakeDoc() as unknown as Document, { x: 0, y: 0 }, apply);
    expect(apply).toHaveBeenCalledOnce();
  });

  it('applies immediately under reduced motion', () => {
    const doc = fakeDoc(true);
    doc.startViewTransition = vi.fn();
    const apply = vi.fn();
    revealThemeChange(doc as unknown as Document, { x: 0, y: 0 }, apply);
    expect(apply).toHaveBeenCalledOnce();
    expect(doc.startViewTransition).not.toHaveBeenCalled();
  });

  it('reveals the new theme with a growing circle', async () => {
    const doc = fakeDoc();
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    doc.startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { ready: Promise.resolve(), finished };
    });
    const animate = vi.fn();
    doc.documentElement.animate = animate;
    const apply = vi.fn();

    revealThemeChange(doc as unknown as Document, { x: 100, y: 0 }, apply);
    expect(apply).toHaveBeenCalledOnce();
    expect(doc.documentElement.dataset['themeTransition']).toBe('');
    await Promise.resolve();
    expect(animate).toHaveBeenCalledWith(
      { clipPath: ['circle(0px at 100px 0px)', 'circle(424.26406871192853px at 100px 0px)'] },
      expect.objectContaining({ pseudoElement: '::view-transition-new(root)' }),
    );
    finish();
    await finished;
    await Promise.resolve();
    expect(doc.documentElement.dataset['themeTransition']).toBeUndefined();
  });
});
