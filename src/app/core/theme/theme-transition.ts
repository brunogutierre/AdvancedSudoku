export interface RevealOrigin {
  readonly x: number;
  readonly y: number;
}

const DURATION_MS = 450;
const EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** True when the user (OS or in-app setting) asked for reduced motion. */
export function prefersReducedMotion(doc: Document): boolean {
  const motion = doc.documentElement.dataset['motion'];
  if (motion === 'reduced') {
    return true;
  }
  if (motion === 'full') {
    return false;
  }
  return doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Runs `apply` (a theme change) inside a View Transition that reveals the new theme with a
 * circle growing from `origin`. Without View Transitions or with reduced motion, `apply`
 * runs immediately and the CSS color transitions on <body> take over.
 */
export function revealThemeChange(doc: Document, origin: RevealOrigin, apply: () => void): void {
  if (typeof doc.startViewTransition !== 'function' || prefersReducedMotion(doc)) {
    apply();
    return;
  }
  const root = doc.documentElement;
  root.dataset['themeTransition'] = '';
  const transition = doc.startViewTransition(apply);
  const view = doc.defaultView;
  const width = view?.innerWidth ?? 0;
  const height = view?.innerHeight ?? 0;
  const radius = Math.hypot(
    Math.max(origin.x, width - origin.x),
    Math.max(origin.y, height - origin.y),
  );

  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
          ],
        },
        { duration: DURATION_MS, easing: EASING, pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => undefined);
  transition.finished.finally(() => delete root.dataset['themeTransition']);
}
