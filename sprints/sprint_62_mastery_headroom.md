# Sprint 62 — measured login-headroom recovery for E11 (REJECTED)

## Spec / real boundary

E11 is blocked because `lib/mastery.ts` (the real persistence adapter used by
`screens/shared/practice-session.tsx`) sits in the login common chunk with only
28 B of headroom. The only common-chunk consumer of its `getMasteryBand` helper
appeared to be `src/intelligence/mastery/masteryCoordinator.ts`. That
coordinator does not need the persistence adapter or its Supabase/AsyncStorage
imports — it needs a three-way band classification of a score.

## Change attempted

Inlined the unchanged band classification in `masteryCoordinator.ts` and
removed the `lib/mastery.ts` import, then also removed `getMasteryBand` from
`lib/mastery.ts`, then layered on the canonical `evaluateMastery` adapter.
Thresholds, labels and behaviour were left unchanged.

## Acceptance result — FAILED

1. `npm run build` exit 0 — yes for every variant.
2. `npm run perf:login-route` PASS at 733,000 B — **no**. Baseline 732,972 B;
   coordinator-only 733,122 B; plus helper deletion 733,086 B; plus E11
   adapter 733,738 B. All three variants FAIL.
3. Exact before/after bytes are recorded in
   `docs/evidence/sprint62-mastery-headroom-rejected.md`; no budget or
   assertion changed.
4. The change was reverted. Clean `main` was rebuilt and re-proved at
   732,972 B PASS.

The E11 adapter variant also failed `tsc --noEmit` with TS2322 in the new test
mock; its tests passed but the product path did not.

## Outcome

Rejected. E11 remains blocked on real login-headroom reduction, which requires
removing `lib/mastery.ts` from every common-chunk importer — not a one-line
import swap. Pivoted to slices that do not touch the login common chunk.
