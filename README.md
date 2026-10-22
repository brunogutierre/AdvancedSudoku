# Advanced Sudoku

A modern Sudoku you can play in the browser, offline and in four languages, built with Angular.

It is a rewrite of a 2021 study project ([sudoku](https://github.com/brunogutierre/sudoku)), a vanilla
JavaScript game with HTML tables and a precomputed puzzle bank.

**Play it:** https://brunogutierre.github.io/AdvancedSudoku/ (installable, works offline).

## Goals

- Fluid gameplay with keyboard, mouse and touch, and a polished, minimalist look in light and dark themes.
- Four difficulties graded by the hardest solving technique a puzzle needs.
- Hints that explain the next logical move and the technique behind it.
- Daily challenge (same puzzle for everyone on the same date) and personal statistics.
- Installable Progressive Web App that works offline, with subtle sound and haptics.
- English, Brazilian Portuguese, Spanish and French, switchable at runtime.

## Stack

| Concern       | Choice                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Framework     | Angular 22: standalone components, zoneless change detection, signals, `input()`/`output()`, built-in control flow, OnPush everywhere |
| Puzzle engine | Plain TypeScript (no Angular imports, enforced by ESLint and a test), running in a Web Worker                                         |
| State         | Signal stores (`GameStore`, `SettingsStore`, `StatsStore`) persisted in versioned `localStorage` keys                                 |
| i18n          | [Transloco](https://jsverse.gitbook.io/transloco) with one dictionary scope per feature (en, pt-BR, es, fr)                           |
| Styling       | SCSS with CSS custom properties and `light-dark()`, no component library                                                              |
| Feel          | Web Animations API, View Transitions, canvas confetti, Web Audio (synthesized), Vibration API                                         |
| Offline       | `@angular/service-worker`, web app manifest, self-hosted fonts                                                                        |
| Tests         | Vitest (unit, coverage gate 80%), Playwright + axe-core (end-to-end and accessibility)                                                |
| Tooling       | ESLint (angular-eslint + template a11y rules), Prettier, GitHub Actions, GitHub Pages                                                 |

## Architecture

```
src/app/
├── engine/          # pure TS: grid model, peers, solver, techniques, grader, generator, daily, PRNG
├── engine-worker/   # Web Worker + EngineClient (typed request/response protocol, timeout, fallback)
├── core/            # GameStore (undo/redo), SettingsStore, StatsStore, persistence, theme, i18n, PWA, feedback
├── features/
│   ├── home/        # greeting, continue card, daily card, quick stats, difficulty cards
│   ├── play/        # board, number pad, action bar, radial picker, hints, completion, feel, Konami
│   ├── daily/       # week strip and today's puzzle
│   ├── stats/       # per-difficulty KPIs, streaks, recent games chart
│   └── settings/    # every preference
├── layout/          # header, tab bar, language and theme menus
└── shared/ui/       # icon, button, card, dialog, menu, switch, segmented control, skeleton
public/puzzles/insane.json   # pre-generated insane bank (scripts/generate-bank.ts, fixed seed)
```

**Flow of a game:** the Play page asks `EngineClient` for a puzzle; the worker generates and grades
it (or picks one from the insane bank); `GameStore.newGame` takes it from there. Every move is a
command with before/after cell diffs, so undo/redo is exact and placing a digit plus clearing that
digit from peer notes is one step. Board events derived from those diffs drive animation, sound,
haptics and screen reader announcements from a single source.

### Puzzle engine

- **Model:** a `Uint8Array(81)` of values and a `Uint16Array(81)` of candidate bitmasks; rows,
  columns, boxes and the 20 peers of each cell are precomputed tables.
- **Solver:** bitmask backtracking on the most constrained cell; `countSolutions(grid, 2)` proves a
  puzzle has exactly one solution.
- **Grading by technique, not by guessing depth:** a logical solver always applies the cheapest
  technique that makes progress, and the puzzle's difficulty is the hardest technique it needed.
  Puzzles the ladder cannot finish are rejected, so a hint can always explain the next move.

| Difficulty | Techniques it may need                                  |
| ---------- | ------------------------------------------------------- |
| Easy       | Full house, naked single, hidden single                 |
| Medium     | + Pointing, box/line reduction, naked pair, hidden pair |
| Hard       | + Naked triple, hidden triple, X-Wing                   |
| Insane     | + Swordfish, XY-Wing                                    |

- **Generator:** a seeded full grid, then clue removal in random order with 180° symmetry while the
  solution stays unique, then grading; only puzzles whose grade matches the request are kept.
  Easy and medium take milliseconds and hard a few hundred; insane puzzles are rare in random
  generation, so they come from a 300-puzzle bank (9 kB gzipped) built offline with a fixed seed.
- **Hints:** `nextStep()` returns data (technique, placements, eliminations, cells, units, digits
  and a translation key), which the UI turns into board overlays and a sentence in the current
  language. A wrong digit is pointed out before any technique.
- **Daily challenge:** seeded by `daily:v1:YYYY-MM-DD`, so everyone gets the same puzzle on the
  same date. Monday and Thursday are easy, Tuesday and Friday medium, Wednesday and the weekend
  hard. Golden tests pin the puzzles of fixed dates so a release cannot change them by accident.
- **Correctness:** besides vectors per technique, property tests check that no elimination ever
  removes the solution digit and every placement equals the solution.

### Design decisions

| Decision                             | Why                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Engine in plain TypeScript           | Testable in isolation, reusable in a worker and in a Node script, no framework coupling              |
| Generation in a Web Worker           | Hard puzzles can take up to a second; the UI never freezes                                           |
| Grade by hardest technique           | Matches how people experience difficulty, and guarantees every hint is explainable                   |
| Insane from a pre-generated bank     | Runtime generation of Swordfish/XY-Wing puzzles is unpredictable; a 9 kB bank is instant and offline |
| Command pattern for moves            | Exact undo/redo, and one source of truth for feedback events                                         |
| `localStorage` over IndexedDB        | Data is small (under 200 kB); a synchronous, validated, versioned store is simpler                   |
| Transloco scopes per feature         | Lazy dictionaries and no merge conflicts between features                                            |
| Synthesized sound                    | No audio assets to license or download; the audio context starts on the first gesture                |
| Assisted games excluded from records | Hints, auto-candidates and the Konami combo keep best times honest                                   |
| Updates never reload mid-game        | A service worker update waits until no game is being played                                          |
| GitHub Pages                         | Static app, free hosting, deploys from the same repository on every merge                            |

## Improvements over the 2021 version

| 2021                                 | Now                                                                  |
| ------------------------------------ | -------------------------------------------------------------------- |
| 233 kB bank of puzzles               | Unlimited generated puzzles plus a 9 kB insane bank                  |
| Difficulty by backtracking depth     | Difficulty by the techniques a person needs                          |
| Notes shown on hover around the cell | 3×3 notes inside the cell and a radial picker for touch              |
| Ctrl+Z only                          | Undo and redo for every action                                       |
| Konami code fills singles            | Still there, now with a proper banner and sound                      |
| No hints, no stats, Portuguese only  | Teaching hints, daily challenge, statistics, four languages, offline |

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
npm run e2e            # Playwright end-to-end + axe accessibility tests (Chromium)
```

The end-to-end suite runs against the **production build** served under `/AdvancedSudoku/` by a
tiny static server (`e2e/server.ts`), so the base href, service worker, engine worker chunk and
puzzle bank are exercised from their real paths (including an offline reload). Games are made
deterministic by seeding a saved game in `localStorage` before the app boots, or by reading the
solution the app autosaves; no test hooks exist in production code. Run
`npx playwright install chromium` once before the first run.

CI runs lint, format check, tests, a production build and the end-to-end suite on every pull
request; every push to
`main` deploys to GitHub Pages (with a `404.html` copy of `index.html` so deep links work).

## License

[MIT](LICENSE).
