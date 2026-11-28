# Sprint 92 — Stitch incoming audit and real tutor handoff

**Date:** 2026-11-28 · **Base:** `main` `fccca43` · **Type:** evidence + one functional
core-loop correction.

## Trigger

The owner supplied 37 newly downloaded Stitch folders under
`docs/design/stitch-incoming/`. Before any screen code is written, the repo's
spec-first and verified-claims rules require establishing what is actually new,
and then closing the most direct functional gap on the Stitch core loop.

## Audit spec

1. Compare every incoming `code.html` with the tracked `docs/design/stitch/`
   exports by SHA-256. Record byte-identical, whitespace-only and genuinely new
   files. `screen.png` files are visual references only; this model cannot view
   images, so no screenshot claim is made from them.
2. Read the two incoming `DESIGN.md` theme documents and compare their tokens
   with `src/design/tokens.ts` and `docs/design/stitch/design-tokens.json`. A
   theme is "integrated" only when its values are already the runtime source of
   truth — not merely present as a downloaded file.
3. Record the result in `docs/evidence/S92-stitch-incoming-audit.md`. No key,
   token or learner datum is copied into the repo.

## Functional spec

The Stitch Home reference's "Ask question" quick action opens a tutor session
(stage stepper, governed citations, honest not-in-notes state). The live Home
screen sends that action to `/(tabs)/study`, a different chat surface with no
stage stepper. The dedicated, already-wired `/tutor/session` route exists and is
tested at `tests/screens/phase2-tutor-session.test.tsx`, but is unreachable from
Home. This is a real broken handoff, not a styling choice.

1. Add a real-component test to `tests/screens/home-today.test.tsx` that presses
   the actual "Ask a question" button and asserts the router receives
   `/tutor/session`. It must be **red before** the change.
2. Change only that one quick action in `screens/tabs/index.tsx` to
   `router.push('/tutor/session')`. No other action, layout, cap, threshold,
   matcher or timeout changes.
3. Prove the test is **green after** the change and that the full local gate is
   green. Update `README.md`, `STATUS.md` and `CHANGELOG.md` in the same change:
   the README must describe the new handoff, not stale behaviour.
4. No readiness row is promoted by this change. CI proof is recorded separately
   after the green PR-head and green `main` runs.

## Acceptance

- Red test output and green test output are both recorded under `docs/evidence/`.
- Existing route-ownership and screen tests remain green without edits.
- `npm run typecheck`, `npm run lint`, `npm test`, boundaries, QA, `npm run build`
  and `npm run e2e:full` are green.
- No fabricated screenshot path, no invented coverage claim, no secret, no row
  promotion.
