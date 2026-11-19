# Sprint — Mathematics Journey Integration (Next Cycle)

- store/mathJourneyStore.ts: zustand+AsyncStorage persisted diagnostic/evidence/mastery/recommendation. Canonical state projection via projectCanonicalLearnerState.
- app/math-journey.tsx: learner route; linked from app/explore.tsx.
- tests/domain/mathJourneyStore.test.ts (2 passing), math journey/graph tests passing.
- **tests/flows/mathLearnerJourney.integration.test.ts** (NEW, 15 tests): complete Mathematics learner journey

**Domain-level integration tests (proving deterministic logic, NOT browser E2E):**
- Complete journey: diagnostic → practice → validated evidence → canonical state projection → mastery/prerequisites → recommendation
- Evidence ownership: all outbox records carry correct learnerId; outboxForLearner filters correctly; no cross-learner contamination
- Learner isolation: outboxForLearner returns only requesting learner's records (in-memory filtering only; database-enforced isolation covered by tests/integration/evidenceRls.integration.test.ts)
- Mastery determinism: identical evidence → identical mastery level/confidence/reason
- Independent evidence scores higher than hinted evidence
- No evidence → not_assessed with zero confidence
- Prerequisite gaps: findGaps/allPrerequisites correctly traverse MATH_PREREQ_EDGES
- Recommendations traceable: valid journey action, non-empty reason, missing prereqs → learn-prerequisite

**Store-level integration tests (proving Zustand store behavior):**
- Auth boundary: learnerId derived from authenticated session via authStore.setSession()
- Reload persistence: Zustand persist + AsyncStorage rehydration — state written to AsyncStorage mock persists across reset(); cleared AsyncStorage + reset() prevents cross-learner state inheritance
- Offline/retry via actual syncPending(writer) pathway: writer failure leaves records pending/failed (not dropped); writer recovery + future-time retry marks records synced only after backend confirmation; no duplicate evidence on retry

**runMathJourney deterministic for identical inputs+clock**

- Gates: tsc 0; lint 0 errors; tests 80 files / 458 tests (15 new); boundaries 0 violations; QA runner SUCCESS; perf:budget PASS; perf:login-route PASS
- STATUS.md updated: branch fix/next-cycle, test count 80/458, all gates green
- CHANGELOG.md: [1.6.0] release entry added
