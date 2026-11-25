# Sprint 64 — CI proof for Sprint 63 readiness rows

Branch `docs/sprint63-ci-proof`. PR #37
(`feat/recommendation-surface`) produced the pushed green run
`https://github.com/dmuhoro/EasyTutor/actions/runs/45623624256`.
`node scripts/readiness/check-pr-checks.mjs 37` exited 0 with all 5 checks
passing:

```
[PR CHECKS] PASS — PR 37: all 5 checks reported; no pending or failing check.
  run: https://github.com/dmuhoro/EasyTutor/actions/runs/45623624256
```

The `build` job log contains the exact acceptance evidence:

```
✓ tests/flows/recommendation.surface.test.ts (3 tests)
 Test Files 112 passed (112)
Run grep -q "112 files / 596 tests" AGENTS.md
```

The QA runner job executed the same real-screen file again with all 3 cases
passing. Nothing was skipped or rerun to hide a failure.

## Promotions

| Row | Basis |
|---|---|
| C21 | Exact acceptance file passed in the pushed green full suite; `VERIFIED-LOCAL` → `VERIFIED-IN-CI` |
| GT-21 | Exact new `112 files / 596 tests` grep ran and passed in that run; `VERIFIED-LOCAL` → `VERIFIED-IN-CI` |

No other row was promoted. This run does not prove E11, canonical consumers on
all screens, curriculum status UI, capacity, raw-hex/i18n/a11y/mobile targets
or staging. No budget, threshold, weight or assertion changed; no code ships
in this slice.
