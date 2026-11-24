# Sprint 39 — E5 RLS matrix in CI

## Context

Wave 1 epic 5. GT-11: the 247-assertion RLS proof was manual-only. Roadmap §E5. Branch
`fix/e5-dependency-vulns` from `origin/main`; no PR opened (two PRs already open).

## Spec / boundary

- Real boundary is `.github/workflows/ci.yml` plus the existing executable
  `scripts/security/run_rls_matrix_local.sh`; no new helper was invented.
- No budget, threshold, timeout or assertion changed; no test skipped or renamed.
- No secret printed or committed; throwaway local Docker containers only, cleaned by EXIT trap.

## Work done

1. Ran the hardened proof: `rows=247 pass=247 fail=0 blocked=0`, exit 0.
2. Ran the built-in negative control (`RLS_PROOF_UNHARDENED=1`): `pass=70 fail=177`, script
   exited 0 *because it detected* the defect — proving the gate is not vacuous.
3. Added a fail-closed `rls-matrix` CI job with both steps in that order. YAML parses.

## Evidence

- `docs/evidence/E5-rls-matrix-ci.md`
- Logs `/tmp/work/e5-rls-hardened.log`, `/tmp/work/e5-rls-unhardened.log`

## Honest handover

DONE locally and in config. `VERIFIED-IN-CI` withheld: no PR slot, no Actions run on this head.
Daniel-only: none.
