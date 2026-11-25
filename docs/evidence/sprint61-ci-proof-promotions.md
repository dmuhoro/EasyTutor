# Sprint 61 — CI proof for due-review readiness rows

Branch `docs/sprint60-ci-proof`. PR #34 (`feat/spaced-repetition-surface`) produced the
pushed green run
`https://github.com/dmuhoro/EasyTutor/actions/runs/45615298022`.
`node scripts/readiness/check-pr-checks.mjs 34` exited 0 with all 5 checks passing:

```
[PR CHECKS] PASS — PR 34: all 5 checks reported; no pending or failing check.
  run: https://github.com/dmuhoro/EasyTutor/actions/runs/45615298022
```

The `build` job log contains the exact acceptance evidence:

```
✓ tests/flows/spacedRepetition.surface.test.ts (3 tests | 43ms)
 Test Files 111 passed (111);  Tests 593 passed (593)
Run grep -q "111 files / 593 tests" AGENTS.md
Run npm audit --omit=dev --audit-level=critical
[LOGIN BUDGET] PASS
```

The QA runner job executed the same real-screen test file again with all 3 cases passing.
No check was skipped or rerun to hide a failure.

## Promotions

| Row | Basis |
|---|---|
| C20 | Exact acceptance file passed in the pushed green full suite; `VERIFIED-LOCAL` → `VERIFIED-IN-CI` |
| GT-14 | Same real Home-screen test file passed in that run; `VERIFIED-LOCAL` → `VERIFIED-IN-CI` |
| GT-21 | Exact new gate `grep -q "111 files / 593 tests" AGENTS.md` ran and passed in that run; stale 110/590 CI URL is no longer cited |

No other row was promoted. This run does not prove curriculum status UI, diagrams,
canonical consumers on all screens, capacity, raw-hex/i18n/a11y/mobile targets or staging.
No budget, threshold, weight or assertion changed; no code ships in this slice.

## Scores after promotion

PILOT **55.1 %** (132.90/241), V1-ACADEMIC **50.3 %** (55.80/111),
V1-POLYMATH **40.8 %** (42.40/104), WORLD-CLASS **24.6 %** (29.00/118);
all `READY=NO`. Open P0 counts are 14 / 7 / 8 / 10; critical-not-CI counts
are 8 / 4 / 4 / 5.
