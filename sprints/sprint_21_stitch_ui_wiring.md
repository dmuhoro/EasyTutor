# Sprint 21 — Stitch UI wiring (design source → product)

Date: 2026-11-17. Branch: `feat/stitch-ui-wiring` (from `9af88cb`, release 1.11.0).
Spec: this file (Constitution Article VII.1 — no code without a spec entry).
Design source: `docs/design/stitch/` (35 screens, project `8672350964718206202`).

## Goal

Replace the app's current dark-blue, six-tab presentation with the Stitch design system —
warm-paper light-first, deep teal, DM Sans — and put the Phase-2 screens that were dead code
(`STATUS.md` §Phase 2) on real routes, verified against the exported screenshots at 390 px.

Non-goals: new business logic, payments, AI routing changes, migration changes.

## Why this cannot be one commit

The redesign touches three independent boundaries and each has its own failure mode:

1. **Tokens** — every screen reads `bg-surface-bg` / `text-text-primary`. Swapping values
   changes the whole app at once, so it must be verified before any screen is rewritten.
2. **Navigation** — six tabs → five merges Progress + Profile into "You". Deep links
   (`/progress`, `/profile`) are referenced by tests and the PWA manifest; removing routes
   silently breaks links, which Article I.6 forbids.
3. **Screens** — 35 references, of which the app needs ~12 distinct screens. Rebuilding them
   without the first two layers lands them on the wrong palette and the wrong nav.

## Layers (each must be green before the next opens)

### L0 — Asset + tooling layer (DONE, this sprint)

| Item | Evidence |
|---|---|
| `stitch` MCP connected (18 tools) | `opencode mcp list` → `✓ stitch connected` |
| Sync script reads key from env only | `scripts/design/stitch_sync.mjs` — exits 2 without `STITCH_API_KEY` |
| 35 screens + HTML exports in repo | `docs/design/stitch/manifest.json`, 12 MB |
| Authoritative tokens extracted | `docs/design/stitch/design-tokens.json` |
| Palette/contrast/coverage recorded | `docs/design/stitch/README.md` |

Gate: `node --check` clean, `manifest.json` has 35 records and every record has both files.

### L1 — Design tokens (light-first, both schemes)

`src/design/tokens.ts`, `tailwind.config.js`, `lib/theme.ts`, `docs/design/DESIGN.md`.

- `COLORS` (the static Tailwind mirror) becomes the **light** palette, because the design is
  light-first; `COLORS_DARK` carries the ink palette and is resolved by `getColor(..., 'dark')`.
- Fonts: DM Sans everywhere; `font-syne` is repointed to DM Sans 700 rather than deleted, so
  no screen keeps a silent second display face. JetBrains Mono is added for formulas.
- `tests/design/tokens.test.ts` gains an explicit **both-schemes** contrast matrix — the
  existing assertions stay, none are weakened.
- `DESIGN.md` status moves `Draft — awaiting approval` → `Approved — Stitch baseline`, with
  the rendered hexes (not the prompt's) recorded.

Gate: `npm run typecheck`, `npm test`, and the contrast matrix proving ≥ 4.5:1 for body text
on both schemes, plus the documented amber exception (4.14:1 for `#6e4600` on `#f2a93b`).

### L2 — Navigation (six tabs → five)

- New `app/(tabs)/you.tsx` composes the existing Progress and Profile screens; `Progress` and
  `Profile` leave the tab bar.
- `/progress` and `/profile` stay reachable as **non-tab** routes (deep links keep working) and
  redirect into `/you` with the right section selected — explicit redirect, not a deleted route.
- `tests/navigation/tabs-layout.test.tsx` moves 6 → 5 tabs *and* keeps its one-owner, keyboard
  and selected-state assertions; a new assertion fails if a tab is removed while its route is
  deleted at the same time.

Gate: tab gate 6/6-style coverage on 5 tabs, route smoke 44/44, no orphan route.

### L3 — Screens, in value order

| # | Screen | Route | Reference | Notes |
|---|---|---|---|---|
| 1 | Today | `/` | `today/`, `today-empty-state/`, `today-dark-mode/` | hero card, weak spots, quick actions, week strip |
| 2 | Tutor session | `/tutor/[topic]` (new) | `tutor-session-friction/`, `tutor-session-citation-modal/` | stepper, citation sheet, "answers come from your notes" |
| 3 | Practice + result | `/quiz` | `practice-quiz-question-3/`, `practice-quiz-result-and-working/` | working/sketch tabs, "add to weak spots" |
| 4 | Library + import | `/library` (from `/roadmap`) | `library/`, `library-import-notes-modal/`, `library-importing-state/` | import sheet, progress + "safe to leave" |
| 5 | You | `/you` | `you-profile-and-settings/` | XP, weekly minutes, settings list |
| 6 | Setup steps 3–6 | `/setup` | `onboarding-step-3..6` | draft/reviewed tags must be data-driven |
| 7 | Auth | `/login`, `/check-email` | `sign-in/`, `check-your-email/` | no mascot; keep existing auth flow untouched |
| 8 | States | inline | `state-offline-banner/`, `state-tutor-limit-reached/`, `state-connection-error/`, `state-not-in-your-notes/` | neutral tone, no blame, explicit actions |
| 9 | Desktop ≥ 1024 px | same routes | `desktop-*` | side rail + centre column + sources panel |

Order is stop-the-line: each screen lands with its own passing gate before the next starts.

### L4 — Gates, evidence, release

`npm run typecheck` · `npm run lint` · `npm test` · `node scripts/architecture/validate_boundaries.js` ·
`node scripts/qa/qa_runner.js` · `npm run build` · `npm run perf:budget` · `npm run perf:login-route` ·
`npx playwright test` (visual).

Version bump + CHANGELOG + tag + push (Article 0 of the operating rules).

## Visual pass/fail baseline

Mechanism: Playwright at 390×844, `deviceScaleFactor: 2`, `reducedMotion: reduce`, fixed seed
data, screenshot per screen. Compare against `docs/design/stitch/<slug>/screenshot.*`.

Pass criteria per screen (all must hold):

1. **Layout** — same component order and same count of top-level blocks as the reference.
2. **Palette** — every visible surface maps to a token that equals the reference hex.
3. **Type** — DM Sans resolved; heading sizes within ±2 px of the reference scale.
4. **Contrast** — automated: no text/background pair below 4.5:1 (3:1 for ≥ 24 px bold).
5. **Targets** — every interactive element ≥ 48 px on its smallest side.
6. **Text fit** — the Kiswahili and French strings render without clipping or ellipsis.

A screen that fails any criterion is recorded as failed; it is never "accepted with notes".

## Known risks carried into the sprint

- **1,085 hardcoded hex literals** in `app/`, `components/`, `screens/` (e.g.
  `app/(tabs)/_layout.tsx:14-16`). Tokens cannot reach those; they are converted per screen and
  counted down, not claimed fixed by a global find/replace.
- **Login-route JS ratchet** is frozen at 730,843 B with 44 B of headroom. New UI must not raise
  it; `npm run perf:login-route` is the gate.
- **Light/dark**: the design ships both; the app currently renders dark regardless of scheme.
  L1 makes the schemes real rather than cosmetic.
- **i18n expansion**: French/Kiswahili strings are longer than English; the design's localisation
  variants are the reference for fit.
- **Stitch HTML is not a dependency.** Nothing from `docs/design/stitch/*/code.html` may be
  imported, copied verbatim into a component, or shipped.
