# Sprint 75 — CI proof promotions

**Date:** 2026-11-26 · **Owner:** agent · **Status:** `VERIFIED-IN-CI`.

## Rule applied

A row is promoted to `VERIFIED-IN-CI` only when an exact pushed green run
observed its registered acceptance. Local green runs, helper tests and evidence
files alone are not enough. No test, threshold, timeout or budget was changed;
this layer changes only readiness statuses, evidence links and generated docs.

| Row | Acceptance observed in CI | Green run | Job |
|---|---|---|---|
| C05 | `npm test` over all 114 files / 611 tests, including `tests/flows/library.service.test.ts` | `45701032978` (PR #48) | `build` |
| C23 | `npm test`, including `tests/screens/home-today.test.tsx` | `45701032978` (PR #48) | `build` |
| GT-17 | `npm test`, including `tests/flows/cost.model.test.ts` | `45701032978` (PR #48) | `build` |
| C11 | `npm test`, including `tests/flows/aiProxy.authCap.test.ts` | `45698949588` (PR #47) | `build` |
| GT-21 | `grep -q "114 files / 611 tests" AGENTS.md` | `45698949588` (PR #47) | `build` |
| E5-T3 | `bash scripts/security/run_rls_matrix_local.sh`, including the unhardened negative control | `45696274127` (PR #46) | `rls-matrix` |
| GT-11 | same exact matrix command | `45696274127` (PR #46) | `rls-matrix` |
| C47 | same exact matrix command | `45696274127` (PR #46) | `rls-matrix` |
| E5-T2 | `npm audit --omit=dev --audit-level=critical` | `45684134792` (PR #45) | `build` |
| GT-10 | `npm run perf:login-route` (666,553 / 733,000 B PASS) | `45684134792` (PR #45) | `build` |

GT-21's old run `45623624256` proved the superseded 112/596 count and was
removed from its evidence; keeping it would have been a false-confidence link.

## Truth limits

These are code-path and gate proofs only. They do **not** claim live Groq
validity (D05), an installed APK/full-loop run (D06), hosted state observable by
CI (D02), staging/production migrations, decisions DEC-01/02/03, mobile
Lighthouse or live browser/device E2E. Those rows stay open.

Evidence: `sprints/sprint_75_ci_proof_and_release.md`.
