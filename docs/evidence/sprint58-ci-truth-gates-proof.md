# Sprint 58 — CI truth gates promoted

Pushed branch `feat/ci-truth-gates` produced run
`https://github.com/dmuhoro/EasyTutor/actions/runs/45599097582`. The all-checks
gate `node scripts/readiness/check-pr-checks.mjs 32` exited 0 after the required
checks were green.

## CI evidence

The `build` job log shows both new steps executing:

```
Run grep -q "110 files / 590 tests" AGENTS.md
Run npm audit --omit=dev --audit-level=critical
```

The first attempt of the unrelated `real-stack` job failed at the setup-wizard
assertion `getByText('Flagship learning', { exact: true })`; no test or timeout
was changed. A rerun of that failed job passed (2m50s), and the final all-checks
gate passed. The flake is recorded here rather than hidden.

## Promotions

| Row | Basis |
|---|---|
| GT-12 | Exact `npm audit --omit=dev --audit-level=critical` step ran in CI with 0 critical advisories |
| GT-21 | Exact AGENTS.md suite-count grep ran in CI and passed |

Each row's evidence now carries `run:45599097582`. No other row was promoted:
this run does not prove curriculum status UI, diagrams, canonical consumers,
capacity, raw-hex/i18n/a11y or staging.

## Scores

PILOT **53.8 %**, V1-ACADEMIC **50.3 %**, V1-POLYMATH **37.7 %**, WORLD-CLASS
**24.6 %**; all `READY=NO`. Open P0 counts are 14 / 7 / 8 / 10; critical-not-CI
counts are 8 / 4 / 4 / 5.
