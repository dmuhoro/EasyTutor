# S91 — profile-error banner WCAG AA contrast (red/green)

**Date:** 2026-11-28 · **Branch:** `fix/a11y-error-banner` from `main` `45cd3ae`.
No secret, credential, token, learner data or billing field is recorded here.

## Real-path control

`tests/e2e/coreLoop.demo.spec.ts` gained one serial test that routes the signed-in
app's `GET /rest/v1/profiles` request to a 500, sets the persisted theme to `dark`,
reloads, asserts a real fail-closed banner is visible, waits for the transient
route spinner to clear, and applies the same axe serious/critical filter as the
existing gate at line 225. CI showed a second legitimate path to the same banner
(the 5 s boot deadline message), so the assertion matches their shared real copy
`Using offline defaults.` rather than a timing-dependent exact sentence. The
existing gate was left byte-identical; no matcher, timeout or threshold was
weakened.

## Red (before the fix)

Command: `npm run e2e:full` (5 tests, workers 1, retries 0).

```
✘  5 tests/e2e/coreLoop.demo.spec.ts:236:3 › WCAG 2.2 AA: forced profile-error banner has no serious or critical axe violations (4.6s)
Element has insufficient color contrast of 3.76 (foreground color: #ffffff, background color: #ef4444, font size: 9.0pt (12px), font weight: bold). Expected contrast ratio of 4.5:1
1 failed / 4 passed
```

This matches the two CI real-stack failures on the docs-only PR heads
(runs `46154260642` attempt 1 and `46155692193` attempt 1); one of them also
reported the banner text at 3.15:1 (`#ef4444` on `#fbe7e2`).

## Fix

`app/_layout.tsx:351-359` only:

- banner container now uses an opaque `bg-legacy-red950` with a
  `border-legacy-red700`, so its contrast does not depend on the selected theme;
- banner text `text-legacy-red500` → `text-legacy-rose300` (`#fda4af`) on that
  opaque dark-red surface;
- `Retry` button `bg-legacy-red500` → `bg-legacy-red900` (`#7f1d1d`) with white
  text.

A theme-dependent red was tried first and rejected: CI showed `#b91c1c` on a
dark wash at 2.73:1 and the forced-dark control showed `#f87171` on a light wash
at 2.32:1. All tokens already exist in `src/design/legacyPalette.ts` and
`tailwind.config.js`. No layout, copy, data flow, cap, budget, threshold or
existing test assertion changed.

## Green (after the fix)

Command: `npm run build` then `npm run e2e:full`.

```
✓  4 tests/e2e/coreLoop.demo.spec.ts:225:3 › WCAG 2.2 AA: authenticated Home has no serious or critical axe violations (2.4s)
✓  5 tests/e2e/coreLoop.demo.spec.ts:236:3 › WCAG 2.2 AA: forced profile-error banner has no serious or critical axe violations (1.7s)
5 passed (12.8s)
```

Full local gate on the same tree: typecheck 0, lint 0 errors, 119 files / 632
tests, boundaries 0 violations, QA all systems verified, web export OK, perf
budget and login route PASS.

## Not claimed

No readiness row is promoted by this fix. It does not prove a live hosted AI
call, staging, device install, PWA installability or a release. No accessibility
claim is made beyond the two real-path axe tests above.
