# M1 T8 — full-chain Mathematics test restored

Added `tests/flows/mathFullChain.m1.test.ts` with the 12 cases from commit
`2ec396a`, adapted to the current authenticated store API
(`activateLearner` → `beginDiagnostic` → `submitAnswer`) instead of the removed
`recordDiagnostic`, `recordPractice` and `setLearningPort` calls. The existing
authenticated evidence-flow suite (`mathLearnerJourney.integration.test.ts`,
11 tests) was left untouched.

Coverage includes full authenticate → learn → practice → project → recommend,
learner ownership, mastery from valid evidence, prerequisite gaps, traceable
recommendations, learner switching, offline writer failure/retry, drain
confirmation, and four determinism cases.

## Commands run this session

- `npm run typecheck` → 0 errors.
- `npx vitest run tests/flows/mathFullChain.m1.test.ts tests/flows/mathLearnerJourney.integration.test.ts` → 2 files / 23 tests passed.
