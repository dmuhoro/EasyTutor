# Sprint 59 — one mastery system (E11) — REJECTED

## Spec / real boundary

`E11-T1`, `E11-T2` and `GT-06` are open on a real path: `screens/shared/practice-session.tsx`
calls `lib/mastery.ts::updateMastery`, and the same persistence adapter feeds
`screens/shared/mastery.tsx`, `lib/recommendations.ts` and the adaptive engines.
`src/domain/learning/mastery.ts::evaluateMastery` is the one deterministic selector used by
the canonical journey projection.

## Attempt and proof

Three new adversarial cases in `tests/mastery.unified.test.ts` were written first and proven
red (**3 failed / 2 passed**) against the current adapter: canonical confidence/level/band
in the cached record, canonical rehydration of a governed DB read, and fail-closed handling
of an invalid 0-total attempt. The adapter implementation made all five cases green.

## Rejection

The unchanged 733,000 B login ratchet failed for every implementation variant
(733,692–733,763 B). The selector sits in the login common chunk, so adding the adapter
dependency there costs ~700 B with only 16 B of headroom. The implementation was reverted,
not the budget. Evidence: `docs/evidence/sprint59-mastery-unification-rejected.md`.
No test, threshold, weight or budget was weakened; no row was promoted; the shipped tree is
unchanged.

## Open

E11 remains blocked on measured login-headroom reduction or an equivalent bundling design.
Next slice: a surface proof whose code lives in a lazy route, so the ratchet is untouched.
