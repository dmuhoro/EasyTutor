# Sprint 57 — CI enforces two previously local-only truth gates

## Real boundary

Two readiness rows were stuck at `VERIFIED-LOCAL` because their acceptance
commands were never run by CI:

- `GT-12` — `npm audit --omit=dev --audit-level=critical`.
- `GT-21` — AGENTS.md test count.

`GT-21`'s pinned string was `92 files / 515 tests`, itself stale: the repo
AGENTS.md said `98 files / 546 tests`, while the green suite is now
`110 files / 590 tests`. The assertion was updated to the **current true count**,
not weakened or removed. It remains an exact, fail-closed grep: any future test
count drift breaks CI until the governing doc is corrected.

## Changes

- `.github/workflows/ci.yml` now runs both commands as named steps in the
  `build` job, after `Tests`.
- `AGENTS.md` records the real suite count.
- `docs/readiness/register.json`: GT-21 acceptance updated to the current count;
  both rows gained this evidence file. No status, weight, budget or threshold
  changed in this slice.

## Red before green

Before the fix, `grep -q "110 files / 590 tests" AGENTS.md` exited **1** against
the stale `98 files / 546 tests` line. After the fix it exits **0**. `npm audit
--omit=dev --audit-level=critical` exits **0** locally (31 non-critical
advisories remain: 2 low, 11 moderate, 18 high; 0 critical). The historical red
for GT-12 — one critical `shell-quote` advisory — is recorded in
`docs/evidence/sprint48-shared-wins.md`.

## Promotion rule

Neither row is promoted in this slice. They move to `VERIFIED-IN-CI` only after
a pushed run shows both new CI steps green and `node scripts/readiness/check-pr-checks.mjs`
exits 0 on the PR.

## Full local gate

Same full gate as the prior slice: typecheck 0; lint 0 errors; `npm test`
110 files / 590 tests; boundaries 0; governance 0; AI boundary PASS; imports
PASS; readiness 0; build 0; login budget PASS; QA SUCCESS; `audit:full` 0.
Scores remain PILOT **53.3 %**, V1-ACADEMIC **49.2 %**, V1-POLYMATH **36.5 %**,
WORLD-CLASS **23.6 %**; all `READY=NO`.
