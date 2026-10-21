# Advanced Sudoku

A modern Sudoku you can play in the browser, offline and in four languages, built with Angular.

It is a rewrite of a 2021 study project ([sudoku](https://github.com/brunogutierre/sudoku)), a vanilla
JavaScript game with HTML tables and a precomputed puzzle bank.

> Work in progress. This README grows with every pull request.

## Goals

- Fluid gameplay with keyboard, mouse and touch, and a polished, minimalist look in light and dark themes.
- Four difficulties graded by the hardest solving technique a puzzle needs.
- Hints that explain the next logical move and the technique behind it.
- Daily challenge (same puzzle for everyone on the same date) and personal statistics.
- Installable Progressive Web App that works offline, with subtle sound and haptics.
- English, Brazilian Portuguese, Spanish and French, switchable at runtime.

## Design

- **Direction: "Ink & Paper".** Warm paper light theme and deep graphite dark theme, a single
  indigo accent, generous whitespace, soft layered shadows and quiet, spring-based motion. The
  board is the only loud element while playing; everything else recedes.
- **Tokens** live in [`src/styles/_tokens.scss`](src/styles/_tokens.scss) as CSS custom
  properties: surfaces, text, accent, status, one accent + tint per difficulty, board states,
  type scale, 4px spacing, radii, elevation and motion. Colors use `light-dark()`, so a theme is
  just `color-scheme`; `data-theme` on `<html>` pins light or dark, and its absence follows the
  system. An inline script in `index.html` applies the saved theme before first paint.
- **Fonts:** [Fraunces](https://fonts.google.com/specimen/Fraunces) for the wordmark and display
  text, [Inter](https://rsms.me/inter/) for UI and digits (tabular numbers, `cv11`, `ss01`).
  Both are self-hosted (latin-subset variable woff2, `font-display: swap`, SIL OFL 1.1) so the
  game looks right offline and makes no third-party requests.
- **Accessibility:** WCAG AA contrast for every text pair in both themes, visible
  `:focus-visible` ring, 44px touch targets, skip link, landmarks, ARIA menu buttons, native
  `<dialog>`, polite live region for toasts, `prefers-reduced-motion` (plus an in-app override
  via `data-motion`), `prefers-contrast: more` and `forced-colors` support.
- **Motion:** route changes and the theme switch use the View Transitions API (the theme is
  revealed by a circle growing from the toggle); browsers without it get plain color transitions.

## Playing

- Mouse, touch or keyboard: arrows move, 1-9 place, Shift+digit or notes mode (N) pencils a note,
  Backspace/Delete/0 erase, Ctrl+Z / Ctrl+Y undo and redo, A fills every candidate, P or Esc pause.
- **Radial picker:** long-press (or right-click, or Space) a cell to get a ring of digits around
  it, with clear, fill candidates and a Value | Notes switch. Drag to a digit and release, or tap.
- Feedback is synthesized with Web Audio (no audio files) and uses the Vibration API where it
  exists; both, plus reduced motion, are in Settings.

## Progressive Web App

- Installable (web app manifest with relative `start_url`/`scope`, maskable icon).
- The Angular service worker prefetches the app shell, every lazy chunk (including the engine Web
  Worker), the fonts and the dictionaries, and caches the insane puzzle bank on first use, so
  every page, language and difficulty works offline.
- New versions are offered with a "Reload" toast, but never while a game is being played; the
  game is saved and paused before reloading.

## Development

```bash
npm ci
npm start              # dev server on http://localhost:4200
npm test               # unit tests (Vitest), single run
npm run test:ci        # unit tests with coverage
npm run lint           # ESLint (angular-eslint, template accessibility rules)
npm run format:check   # Prettier
npm run build -- --base-href /AdvancedSudoku/
```

CI runs lint, format check, tests and a production build on every pull request; every push to
`main` deploys to GitHub Pages (with a `404.html` copy of `index.html` so deep links work).

## License

[MIT](LICENSE).
