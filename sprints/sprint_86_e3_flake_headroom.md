# Sprint 86 — E3-T2 / E3-T3 proof layer (spec, written before code)

**Parent spec:** `sprints/sprint_86_pilot_ready.md` (WS4)

## Premise verified before edit

- The original failure is already recorded in
  `docs/evidence/ground-truth-2026-11-24.md:102–116`: `quiz.wrongAnswers`
  timed out once in 20 in-suite runs at 5,035 ms versus 221–285 ms solo.
- The contention-sensitive cold-load was already removed on the real path:
  `tests/utils/warmLearningPort.ts` warms the lazy learning port in `beforeAll`,
  and `tests/flows/quiz.wrongAnswers.test.ts` injects a deterministic router at
  the production `PipelineExecutor` seam. The 5 s per-test timeout and all
  assertions were left unchanged.
- `npm run perf:login-route` on main `74d002c` measures 675,543 B against the
  unchanged 733,000 B ratchet: **57,457 B / 7.8% headroom**, already above the
  >=10 KB target. No budget change is warranted; lowering a ratchet without a
  byte reduction would be a false claim.

## This unit

1. `scripts/qa/flake-proof.sh` runs `npm test` 20 consecutive times, refuses a
   run with no `Test Files … passed` line, stops on the first failure, and
   writes one log per run.
2. `.github/workflows/flake-proof.yml` (`workflow_dispatch`) runs that script on
   Node 22.13 and uploads logs on failure. Promotion requires a green run on
   the exact pushed `main` SHA.
3. Red control for the new gate: inject a deliberately failing temporary test,
   show the script exits 1 on run 1, then remove it. The 5 s timeout and
   assertions are never changed.
4. Green control: 20 consecutive in-suite runs, zero failures, logs retained.
5. E3-T3 evidence cites the unchanged budget and the measured headroom; no
   code, threshold or budget is changed.

## Non-goals

- No readiness row is promoted in this code change.
- No test timeout, worker cap, assertion, matcher or suite ratchet is changed.
- No `DEC-0N.md` or `daniel-D0N.md` file is created.

## Order

Spec → red control for the gate → local 20-run proof → workflow → full gate →
code PR → exact pushed green CI → separate docs promotion PR.
