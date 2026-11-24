# E5 — RLS matrix in CI

Branch `fix/e5-dependency-vulns` (name retained from an early mislabel; the authoritative
roadmap §E5 is **RLS matrix in CI**) from `origin/main` @ `859b9dc`. No PR opened (cap of two:
#19 R0 and #20 E1 are open). No threshold, budget, timeout, assertion or test was weakened.

## Premise

GT-11: `scripts/security/rls_matrix_rest.mjs` was manual-only and unreferenced by any workflow.
The strongest trust proof (247 cross-tenant assertions) never ran on a push.

## Real-boundary proof (local, throwaway Docker only)

| Command | Result |
|---|---|
| `bash scripts/security/run_rls_matrix_local.sh` | exit 0 — `rows=247 pass=247 fail=0 blocked=0` |
| `RLS_PROOF_UNHARDENED=1 bash scripts/security/run_rls_matrix_local.sh` | exit 0 **because** `rows=247 pass=70 fail=177` — `✅ defect reproduced: harness failed without the hardening migration (exit 1)` |

The negative control is the proof that the gate is not vacuous: against the deliberately
insecure baseline (no `20261104_rls_hardening.sql`) 177 assertions fail, and the script exits 0
only because it *observed* that failure. If the harness ever passed the insecure fixture, the
script exits 1 with `FATAL: harness passed against the insecure baseline`.

Logs: `/tmp/work/e5-rls-hardened.log`, `/tmp/work/e5-rls-unhardened.log`. No staging or production
project was touched; no secret was printed or committed.

## CI change

`.github/workflows/ci.yml` gained a fail-closed `rls-matrix` job:

1. checkout → Node 22 → `npm ci`
2. `RLS_PROOF_UNHARDENED=1 bash scripts/security/run_rls_matrix_local.sh` (negative control)
3. `bash scripts/security/run_rls_matrix_local.sh` (247/247 against the committed migration)

No `continue-on-error`, no `|| true`, no relaxed assertion. YAML parsed: jobs `build`,
`rls-matrix`. The job uses the script's own isolated Postgres/PostgREST containers and cleans
them up via its EXIT trap.

## Honest handover

DONE at code/local-proof level: the 247-assertion matrix is wired into CI with a negative control.
`VERIFIED-IN-CI` is **not** claimed: no PR could be opened under the two-PR cap, so no GitHub
Actions run exists for this head. Daniel-only: none.
