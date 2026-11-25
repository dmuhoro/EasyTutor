# Sprint 60 — surface due reviews on Home (C20 / GT-14)

## Spec / real boundary

`C20` and `GT-14` are open: the real `lib/spacedRepetitionEngine.ts` computes due reviews
and at-risk knowledge, but no learner-facing screen consumes it. The reachable Home tab
(`screens/tabs/index.tsx`) already renders only local-store truth and is token/translation
clean (0 raw hex, all visible copy via `t()`), so it is the correct boundary for this slice.

## Acceptance (red before green)

Add `tests/flows/spacedRepetition.surface.test.ts`, mounting the real Home screen with the
real `getDueReviews` selector and a controlled retention store. It must prove:

1. Home calls the retention store for the signed-in learner and surfaces only genuinely due
   items — a future review is never shown as due.
2. Due topic data from the engine is rendered, with no invented sample content.
3. An empty store shows no false due-review section.
4. A store failure is logged as `HOME_due_reviews_failed` and shows no false due-review
   section (no silent drop).

No mock of `getDueReviews` itself: the engine's real date filter is exercised. First run:
2 failed / 1 passed; final: 3 passed.

## Constraints honoured

No threshold, weight or budget change. New locale keys and a per-review button were both
removed after they breached the unchanged 733,000 B ratchet; existing translated `review`
and `flagged` keys are reused and no en/sw/fr key changed. Home keeps zero raw hex and all
new visible copy goes through `t()`. Final login transfer 732,972 / 733,000 B PASS.
The exact suite count gate moved with the new file to 111 files / 593 tests (red before,
green after). C20/GT-14 are `VERIFIED-LOCAL`; GT-21 is demoted to `VERIFIED-LOCAL` until
CI re-proves the new count. Evidence:
`docs/evidence/sprint60-spaced-repetition-surface.md`.
