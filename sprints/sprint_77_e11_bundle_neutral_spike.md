# Sprint 77 — E11 bundle-neutral mastery adapter spike

## Spec and real boundary

`E11-T1`, `E11-T2`, and `GT-06` remain open in
`docs/readiness/register.json`. The live boundary is:

- `screens/shared/practice-session.tsx:110` calls `updateMastery` from
  `lib/mastery.ts`.
- `src/intelligence/mastery/masteryCoordinator.ts:2,36` imports and calls
  `getMasteryBand` from `lib/mastery.ts`.
- `src/domain/learning/mastery.ts:16` is the canonical deterministic
  `evaluateMastery` used by `src/domain/learning/canonicalLearnerState.ts:175`.

Sprint 59 failed because the adapter hydrated canonical confidence, level, and
band into every cached/DB mastery record and added ~700 B in the old login
common chunk. Sprint 62 failed because headroom recovery was measured before
Sprint 69 removed runtime Zod from the login path.

The 2026-11-26 truth pass (`docs/evidence/truth-pass-2026-11-26.md`) now shows
`666,978 / 733,000 B PASS` on the exact release commit. This authorizes one
measured spike, not a promotion.

## Goal

Make the persistence adapter use the canonical evaluator without changing any
learner-visible mastery value, persisted record shape, portal scope, cache key,
or analytics event contract.

## Change surface

1. Add to `src/domain/learning/mastery.ts`:
   - a percent-to-evidence adapter that calls `evaluateMastery`;
   - a band selector that calls that adapter and returns the existing
     `weak` / `developing` / `strong` labels.
2. Change `lib/mastery.ts` so:
   - `getMasteryBand` delegates to the domain band selector;
   - `updateMastery` uses the canonical percent adapter for the existing weak
     topic decision.
3. Preserve all existing numeric boundaries exactly:
   - band: `<40 weak`, `<70 developing`, otherwise `strong`;
   - weak topic: `<50` after at least two attempts.
4. Do not add canonical `level`, `confidence`, or `reason` fields to
   `MasteryRecord`; they are not persisted and must not be invented.
5. Do not change governed reads/writes, cache behavior, thresholds, budget,
   weights, tests, or acceptance commands.

## Required red proof before implementation

Add adversarial tests that fail on the untouched implementation:

1. `getMasteryBand` must delegate to the domain band selector.
2. `updateMastery` must consume the canonical percent adapter on the real write
   path, not merely the raw percentage.
3. Band boundaries and weak-topic behavior must remain unchanged at exact
   edges (`39/40`, `69/70`, `49/50`).

Record the exact red output in `docs/evidence/` before editing production code.

## Hard gates after implementation

All must pass on the unchanged budgets:

```bash
npm run typecheck
npm run lint
npm test
node scripts/architecture/validate_boundaries.js
npm run audit:governance
npm run check:imports
npm run check:ai-boundary
npm run build
npm run perf:login-route
node scripts/qa/qa_runner.js
npm run readiness:check
```

Fail-closed conditions:

- login transfer `> 733000 B`: revert the implementation;
- any typecheck/lint/test/boundary failure: revert;
- any persisted-record or threshold drift: revert;
- no readiness row is promoted from this spike alone.

## Outcome recording

A pass authorizes separate, sequential `GT-06`, `E11-T1`, and `E11-T2` work with
individual red/green evidence and CI proof. A fail produces a written rejection
with exact bytes and a fallback to `C03 + C04` real-screen onboarding proof.

## Recorded outcome — REJECTED

CI run `45775046681` passed `build` and RLS jobs but failed the real-stack
walkthrough on all three attempts (`139756567771`, `139759890249`,
`139761959072`). The production adapter was reverted and the tests archived.
Exact evidence: `docs/evidence/sprint77-e11-ci-rejected.md`. Next work is the
`C03 + C04` real-screen onboarding/setup proof.
