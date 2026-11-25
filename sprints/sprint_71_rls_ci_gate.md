# Sprint 71 — RLS matrix enforced in CI

## Spec / real boundary

Rows `E5-T3` and `GT-11` required the 247-assertion tenant-isolation matrix to
run in CI, not only locally. The live boundary is
`supabase/migrations/20261104_rls_hardening.sql` exercised through PostgREST by
`scripts/security/run_rls_matrix_local.sh`. Before this sprint no CI job ran it.

## Change

- Added a fail-closed `rls-matrix` job to `.github/workflows/ci.yml` with two
  steps: the unhardened negative control and the full 247-assertion run.
- No application code, migration, budget or test assertion was changed.

## Outcome

Local proof: hardened `247/247 PASS`; unhardened control `70 pass / 177 fail`
(exit 1, converted into a passing control step). `E5-T3` and `GT-11` promoted to
`VERIFIED-LOCAL`; CI-only status is withheld until an exact pushed run is green.

Evidence: `docs/evidence/E5-T3.md`.
