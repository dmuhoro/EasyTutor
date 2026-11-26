# Sprint 82 evidence — GT-06 / E11-T1 / E11-T2 mastery unification

## Why the retry is valid

Sprint 77's adapter was rejected because the real-stack CI walkthrough hung at
`Loading EasyTutor`. Sprint 80 proved on a docs-only PR that the hang was caused
by the test harness leaving a failed `route.fetch()` pending, not by product
code, and fixed the harness with red/fail-fast/green controls. The unchanged
adapter design is retried here on that repaired real path.

## Real boundary

- `screens/shared/practice-session.tsx` → `updateMastery` in `lib/mastery.ts`;
- `src/intelligence/mastery/masteryCoordinator.ts` → `getMasteryBand` in
  `lib/mastery.ts`;
- `src/domain/learning/mastery.ts` owns `evaluateMastery`.

`lib/mastery.ts` no longer keeps duplicate band/weak-topic thresholds. Both
consumers now call the canonical domain evaluator through a percent adapter.
No governed read/write, cache key, persisted field, analytics event, portal
scope or learner-visible number changed.

## Red control — before production wiring

Command:

```sh
npm run test -- tests/mastery.adapter.wiring.test.ts \
  tests/mastery.percent.adapter.test.ts \
  tests/mastery.unified.test.ts
```

Result: **2 files failed / 1 passed; 6 tests failed / 2 passed**. Exact failures:

- `getMasteryBand(90)` returned `strong` instead of the mocked canonical `weak`;
- `evaluateMasteryPercent` was never called on the real `updateMastery` write path;
- `evaluateMasteryPercent` and `evaluateMasteryBand` did not exist.

Production sources were byte-for-byte the `6eca072` release versions, verified
by SHA-256:

```text
77d7b12211e2e7a97f09d817f1dd19061399fd2483b403ffb7b5fa8dffe64e3b  lib/mastery.ts
59a629d754056e7b5c98b0292fcd7642f721784bb4030d50a2a704952178b4d7  src/domain/learning/mastery.ts
```

## Green control — same command, same assertions

After wiring the adapter at the real boundary, the exact command passed:
**3 files / 8 tests**. The 20..80 → weight 0..1 mapping preserves every existing
band edge (`39` weak, `40` developing, `69` developing, `70` strong) and the
`50` weak-topic edge. No threshold, timeout, matcher or assertion was weakened.

## Full local gate

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / 129 warnings (pre-existing) |
| `npm test` | 118 files / 622 tests passed |
| `node scripts/architecture/validate_boundaries.js` | 0 violations |
| `npm run audit:governance` | PASS |
| `npm run check:imports` | 465 files scanned; PASS |
| `npm run check:ai-boundary` | PASS |
| `node scripts/qa/qa_runner.js` | All systems verified |
| `npm run readiness:check` | 153 rows valid; READINESS.md current |
| `npm run guard:secrets` | PASS |
| `npm run guard:dist` | PASS |
| `npm run lint:cycles` | 0 errors / 13 pre-existing orphan warnings |
| `npm run audit:full` | All verification steps passed |
| `npm run build` | exit 0 |
| `npm run perf:login-route` | 669,281 / 733,000 B PASS (+397 B vs 668,884 B) |
| `npm run perf:budget` | gzip 437,861 / 450,000 B; raw 1,674,508 / 1,750,000 B; 39 route chunks PASS |
| `npm run e2e:smoke` | 9 passed |
| `npm run e2e:full` | 3 passed |

Generated readiness at this point remains PILOT 65.6 %, V1-ACADEMIC 53.7 %,
V1-POLYMATH 47.5 %, WORLD-CLASS 29.2 %, all `READY=NO`. No row was promoted in
this code unit. No `DEC-0X.md` file was created or touched.

## CI proof

PR #57 head `1502760d4cd647a4f5745547b2607ae47906fbb7` passed all required jobs
on run [45869512081](https://github.com/dmuhoro/EasyTutor/actions/runs/45869512081):

| Job | Result |
|---|---|
| `build` | pass (2m50s) |
| `Real stack (Supabase CLI + full e2e)` | pass (2m33s) |
| `RLS matrix (247 assertions, fail closed)` | pass (57s) |
| `Vercel – easytutor` | pass |
| `Vercel Preview Comments` | pass |
| `Supabase Preview` | skipped |

The merge commit `9094923a80a8a3d5dac80caaf590ce4d1f93bdf0` also passed on main
run [45870030054](https://github.com/dmuhoro/EasyTutor/actions/runs/45870030054).

### Promotion scope

Only `GT-06`, `E11-T1` and `E11-T2` are promoted to `VERIFIED-IN-CI` on the exact
PR run. Generated scores move PILOT 65.6 → 68.3 % (158.00 → 164.60/241) and
V1-POLYMATH 47.5 → 53.8 % (49.40 → 56.00/104). V1-ACADEMIC (53.7 %) and
WORLD-CLASS (29.2 %) are unchanged; all milestones remain `READY=NO`. No other
row is touched, and no `DEC-0X.md` file is created or edited.
