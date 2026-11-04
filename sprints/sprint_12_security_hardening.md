# Sprint 12 — Security hardening (RLS matrix, migration, REST proof, CI guards)

Date: 2026-11-04.

Layers:
1. Invalid `CREATE POLICY IF NOT EXISTS` syntax fixed in schema.sql and 3 migrations + run-all.sql.
2. Additive, idempotent RLS hardening migration + rollback written and proven twice against throwaway postgres:16.
3. REST harness (`scripts/security/rls_matrix_rest.mjs`) + local/staging runners; local proof 247/247 PASS; unhardened 177/247 FAIL.
4. CI secret exposure + public env allowlist guards wired; client Anthropic rail removed.
5. Docs: RLS_MATRIX.md, SECURITY.md.

Evidence: docs/evidence pending operator export. Gates: typecheck 0, lint 0 errors, full suite passes.