# Sprint 81 evidence — C22 / E10-T2 canonical learner state on real screens

## Scope

`C22` was `PARTIAL` and `E10-T2` was `MISSING`: both pointed only at
`tests/domain/canonicalState.consumers.test.ts`, which proves the pure projection
but not that Home, You or Math journey consume it. This change adds one governed
hook and asserts the real screen boundary.

- `hooks/useCanonicalLearnerState.ts` derives canonical state from
  `useAuthStore`, `useProgressStore` and `useRoadmapStore`, then calls
  `projectCanonicalLearnerState`. No UI calls Supabase directly.
- `screens/tabs/index.tsx` renders the canonical sync chip and mastery
  confidence.
- `screens/tabs/progress.tsx`, mounted through the real
  `screens/tabs/you.tsx` segment control, renders canonical mastery confidence.
- `screens/math-journey.tsx` already consumed `journey.canonical`; its existing
  real-screen test now asserts the rendered confidence, not just the store.

## Red control — before production wiring

Command:

```sh
npm run test -- tests/domain/canonicalState.consumers.test.ts \
  tests/screens/home-today.test.tsx \
  tests/screens/you-canonical.test.tsx \
  tests/flows/mathAuthenticatedEvidence.test.tsx
```

Result: **2 failed / 13 passed**. Both failures are the new canonical
assertions:

- `tests/screens/home-today.test.tsx`: expected `Mastery: 43%`; received the
  Home screen text with no canonical confidence.
- `tests/screens/you-canonical.test.tsx`: expected `Mastery: 43%`; received the
  real YouTab → ProgressTab text with no canonical confidence.

The Math journey real-screen assertion passed because that screen already
rendered its store projection. Production sources were still byte-for-byte the
`main` versions (`6355c61`), verified by SHA-256:

```text
21143e23e4d5942a81bb5c17b66a3ebf9bfa65313637682ba52c663952a1c74c  screens/tabs/index.tsx
9f0d6d76080db9c2adeb0fa9970f175edb7777f80c50ee91227369fcf331643a  screens/tabs/progress.tsx
8da846747b8a16d3926564ba5f0a1d889e449f2a7d25aac530932e49b02f2a23  screens/tabs/you.tsx
9210194af8adc2eba3f8ce00fe0a28f9bfc1fd5f66507ec624521fdd6e1bb5ee  screens/math-journey.tsx
df63331ddf1f0a9d2ea583f6ad54948a7f943e11bd5725c927cc033fcf005b62  store/mathJourneyStore.ts
```

## Green control — same command, same assertions

After wiring the real hook into Home and Progress, the exact command above
passed: **4 files / 15 tests**. One independent application score of 3/4
projects to confidence `0.425` → `Mastery: 43%`. No assertion, matcher, timeout
or threshold was weakened.

## Full local gate

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / 129 warnings (pre-existing) |
| `npm test` | 116 files / 616 tests passed |
| `node scripts/architecture/validate_boundaries.js` | 0 violations |
| `npm run audit:governance` | PASS |
| `npm run check:imports` | 463 files scanned; PASS |
| `npm run check:ai-boundary` | PASS |
| `node scripts/qa/qa_runner.js` | All systems verified |
| `npm run readiness:check` | 153 rows valid; READINESS.md current |
| `npm run guard:secrets` | PASS |
| `npm run guard:dist` | PASS |
| `npm run lint:cycles` | 0 errors / 13 pre-existing orphan warnings |
| `npm run audit:full` | All verification steps passed |
| `npm run build` | exit 0 |
| `npm run perf:login-route` | 668,884 / 733,000 B PASS (+1,906 B vs 666,978 B) |
| `npm run perf:budget` | gzip 437,861 / 450,000 B; raw 1,674,508 / 1,750,000 B; 39 route chunks PASS |
| `npm run e2e:smoke` | 9 passed |
| `npm run e2e:full` | 3 passed |

Generated readiness is unchanged: PILOT 64.1 %, V1-ACADEMIC 53.7 %,
V1-POLYMATH 44.0 %, WORLD-CLASS 29.2 %, all `READY=NO`. No readiness row was
promoted in this change. No `docs/evidence/DEC-0X.md` file was created or
touched.

## CI proof

### Red gate run (first push, head `01c6524`)

Run `45851373581` rejected the branch at the fail-closed suite-count ratchet:
`grep -q "115 files / 614 tests" AGENTS.md` exited 1 because this change
legitimately moved the suite to 116 files / 616 tests. The real-stack job and
RLS matrix passed. The CI literal was then updated to the new exact count; no
threshold was loosened, no assertion removed and no test skipped.

### Green gate run

After the exact suite-count ratchet update, PR #55 head `c43740018a358476bb9407ad035abfde9613da33` passed all required jobs on run
[45852268904](https://github.com/dmuhoro/EasyTutor/actions/runs/45852268904):

| Job | Result |
|---|---|
| `build` | pass (2m47s) |
| `Real stack (Supabase CLI + full e2e)` | pass (2m28s) |
| `RLS matrix (247 assertions, fail closed)` | pass (1m23s) |
| `Vercel – easytutor` | pass |
| `Vercel Preview Comments` | pass |
| `Supabase Preview` | skipped (no preview project state change) |

The merge commit `dbb40aa76c62e63ec6717d11716d11505467d522` also passed on main run
[45852837904](https://github.com/dmuhoro/EasyTutor/actions/runs/45852837904).

### Promotion scope

Only `C22` and `E10-T2` are promoted to `VERIFIED-IN-CI` on the exact PR run.
Generated scores move PILOT 64.1 → 65.6 % (154.40 → 158.00/241) and
V1-POLYMATH 44.0 → 47.5 % (45.80 → 49.40/104). V1-ACADEMIC (53.7 %) and
WORLD-CLASS (29.2 %) are unchanged because neither row belongs to those
milestones; all milestones remain `READY=NO`. No other row is touched, and no
`DEC-0X.md` file is created or edited.
