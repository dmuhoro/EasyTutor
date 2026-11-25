# Sprint 62 — measured login-headroom recovery REJECTED

Branch `feat/mastery-headroom`. Goal was to free enough login-common bytes to
retry the E11 canonical mastery adapter without breaching the unchanged
733,000 B ratchet. The premise was wrong: every measured variant made the
ratchet worse. No code from this experiment ships.

## Real boundary examined

`src/intelligence/mastery/masteryCoordinator.ts` imported `getMasteryBand`
from `lib/mastery.ts`, the persistence adapter used by
`screens/shared/practice-session.tsx`. Removing that single import was
hypothesised to shrink the login common chunk.

## Measurements (all on the unchanged 733,000 B budget)

| Variant | Transferred | Result |
|---|---:|---|
| Clean `main` baseline (`a9fac00`) | 732,972 B | PASS — 28 B headroom |
| Inline the same 40/70 band function in the coordinator | 733,122 B | FAIL (+150 B) |
| Also delete `getMasteryBand` from `lib/mastery.ts` | 733,086 B | FAIL (+114 B) |
| Same two changes plus the E11 `evaluateMastery` adapter | 733,738 B | FAIL (+766 B) |

Commands: `npm run build` then `npm run perf:login-route`. Every line above is
the exact `[LOGIN BUDGET] total transferred` value from that run. No budget,
threshold or assertion was changed.

The E11 adapter variant also had `tsc --noEmit` error TS2322 in
`tests/mastery.unified.test.ts:106` (mock return type inferred as `null`), so
it failed typecheck as well as the ratchet. Its 3 new real-boundary tests did
pass (`3 failed / 2 passed` red before the fix, `13 passed` across the three
touched test files after), but a green test file is not a green product path.

## Why the premise failed

Removing the import does not remove `lib/mastery.ts` from the common chunk:
`lib/knowledgeGraphEngine.ts`, `lib/learningPlanEngine.ts`,
`lib/weaknessPredictionEngine.ts` and the recommendation/coach chain still
pull it in. Inlining the helper duplicates the band logic instead of deleting
it, so transferred bytes rose. The module would have to be removed from every
common-chunk importer — a material refactor well beyond a ratchet tweak —
before E11 could even be attempted.

## Outcome

E11 stays blocked and P0. The clean tree was restored from `main` and the
baseline build/perf re-proved at 732,972 B PASS. Sprint 62 is recorded as a
rejected attempt, like Sprint 59. No score changes; all readiness rows keep
their existing truthful statuses.
