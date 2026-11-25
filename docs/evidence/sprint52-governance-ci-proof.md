# Sprint 52 — governance rows proven in CI

Pushed branch `feat/governed-intelligence-writes` at `c780e07` produced run
`https://github.com/dmuhoro/EasyTutor/actions/runs/45581486206`. The all-checks
gate `node scripts/readiness/check-pr-checks.mjs 26` exited 0 with five checks and
no pending/failing check. The run log shows the `Database governance audit` step
executing `node scripts/architecture/governance_audit.js` and passing, and the
`Login-route JS transfer ratchet` step at 732,675 / 733,000 B PASS.

## Promotions

| Row | Basis |
|---|---|
| E6-T1 | Exact CI step: database governance audit |
| E6-T2 | Exact CI step: database governance audit |
| GT-13 | Exact CI step: database governance audit |

Each row's evidence now carries `run:45581486206` in addition to its file/test
evidence. No threshold, budget, weight or assertion changed. The three gate tests
(including two injected bypasses) ran locally and the exact audit command ran in
CI; the claim remains enforcement outside the unchanged allowlist, not removal
of every legacy allowlisted raw call.

## Rejections

No other row was promoted. The CI log proves only the audit step and the already
proven login/E2E/build steps; no new capacity, countdown, mastery-adapter or
screen-level i18n acceptance ran. `VERIFIED-LOCAL` rows from Sprint 49 without a
matching CI command remain unchanged.

## Scores

PILOT **53.3 %**, V1-ACADEMIC **35.7 %**, V1-POLYMATH **36.5 %**, WORLD-CLASS
**23.6 %**; all `READY=NO`. Open P0 counts remain 14 / 10 / 8 / 10.
