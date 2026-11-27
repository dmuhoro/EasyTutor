# Sprint 86 — E3-T2 / E3-T3 proof layer

**Spec:** `sprints/sprint_86_e3_flake_headroom.md`
**Status:** LOCAL GREEN · **no row promoted** · promotion requires exact pushed green CI.

## Premise verified before edit

`docs/evidence/ground-truth-2026-11-24.md:102–116` records one 5,035 ms timeout
in 20 in-suite runs of `tests/flows/quiz.wrongAnswers.test.ts` against the
unchanged 5 s budget. The contention-sensitive cold module load was already
removed on the real path before this unit: `tests/utils/warmLearningPort.ts`
warms the lazy learning port in `beforeAll`, and the test injects a deterministic
router at the production `PipelineExecutor` constructor seam. No timeout,
worker cap, assertion or matcher is changed by this layer.

`npm run perf:login-route` on this head measures 675,543 B against the unchanged
733,000 B ratchet: 57,457 B / 7.8% headroom, already above the >=10 KB target.
Lowering the ratchet without reducing bytes would be a false claim; no budget,
threshold or code is changed for E3-T3.

## Gate added

`scripts/qa/flake-proof.sh` runs `npm test` `FLAKE_PROOF_RUNS` times (default 20),
writes one log per run, and exits 1 on the first non-zero run, missing
`Test Files … passed` summary, or any `Test Files … failed` summary.
`.github/workflows/flake-proof.yml` exposes it as `workflow_dispatch` on Node
22.13 and uploads logs on failure. Both YAML files parse with `js-yaml`.

## Red control for the new gate

A temporary `tests/__flake_proof_red_control__.test.ts` (`expect(true).toBe(false)`)
was added and the gate run with `FLAKE_PROOF_RUNS=1`:

```text
[FLAKE PROOF] FAIL: npm test exited non-zero on run 01
Test Files  1 failed | 118 passed (119)
     Tests  1 failed | 622 passed (623)
EXIT=1
```

Logs: `docs/evidence/E3-T2-red.txt`, `docs/evidence/E3-T2-red-run01.txt`.
The file was removed before the green proof.

Two further controls use a PATH shim for `npm` that exits **0** and emit either
no pass summary or a pass plus a fail summary; the gate rejects both on output
inspection (`exit 1`), proving the guards are not merely relaying `npm`'s exit
status. Log: `docs/evidence/E3-T2-gate-controls.txt`.

## Green control

20 consecutive in-suite runs, zero failures:

```text
[FLAKE PROOF] PASS: 20 consecutive in-suite runs, zero failures
20 logs; 20 × 'Test Files  118 passed (118)'; 20 × 'Tests  622 passed (622)'
zero 'Test timed out' / '5000ms' lines
```

Logs: `docs/evidence/E3-T2-green.txt`, first and last run logs preserved as
`docs/evidence/E3-T2-green-run01.txt` and `docs/evidence/E3-T2-green-run20.txt`.

## E3-T3 headroom

`docs/evidence/E3-T3-headroom.txt`:

```text
[LOGIN BUDGET] total transferred: 675543 B (budget 733000 B)
[LOGIN BUDGET] PASS
```

Budgets 450,000 / 733,000 / 5,000 s remain unchanged. No production code is
touched by this layer.

## Promotion condition

Neither `E3-T2` nor `E3-T3` is promoted here. Promotion happens only in a
separate docs change after an exact pushed green CI run on this code head,
citing its SHA and run URL. No `DEC-0N.md` or `daniel-D0N.md` file was created
or edited.
