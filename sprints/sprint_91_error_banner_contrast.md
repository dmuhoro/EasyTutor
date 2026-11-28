# Sprint 91 — WCAG AA contrast in the profile-error banner

**Date:** 2026-11-28 · **Base:** `main` `45cd3ae` · **Type:** focused accessibility bug fix.

## Trigger

Two docs-only PR heads (`46154260642` attempt 1 and `46155692193` attempt 1)
failed the real-stack axe test on authenticated Home. Both failures were serious
`color-contrast` violations in the profile-error banner rendered at
`app/_layout.tsx:349-360`:

- white `Retry` text on `#ef4444` — 3.76:1, below the 4.5:1 AA minimum;
- `#ef4444` banner text on the red wash — 3.15:1, below the same minimum.

The earlier green rerun hid an intermittent real defect; no test is weakened or
skipped to chase a pass.

## Spec

1. Add a real-path Playwright control to `tests/e2e/coreLoop.demo.spec.ts` that
   forces the Supabase `profiles` request to fail for the signed-in user, asserts
   the actual error banner is visible, and runs the same axe serious/critical
   filter used by the existing gate. This test must be **red before** the fix.
2. Change only the two banner classes to the already-defined accessible token
   `legacy-red700` (`#b91c1c`): banner text and `Retry` button background. No
   layout, copy, data flow, matcher, timeout or threshold changes.
3. Prove the same test is **green after** the fix, and that the full local gate
   stays green. Record red and green output under `docs/evidence/`.
4. Update `STATUS.md` and `CHANGELOG.md` in the same change.

## Acceptance

- New test fails on the old classes and passes on the new classes.
- Existing axe test at `tests/e2e/coreLoop.demo.spec.ts:225` remains byte-identical.
- `npm run typecheck`, `npm run lint`, `npm test`, boundaries, QA, `npm run build`
  and `npm run e2e:full` green.
- No readiness row is promoted by this accessibility fix.
