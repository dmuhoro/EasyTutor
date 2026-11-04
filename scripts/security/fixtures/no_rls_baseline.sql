-- ============================================================================
-- DELIBERATELY INSECURE BASELINE — proof that the harness detects the defect.
--
-- Mirrors the audited pre-hardening surface:
--   * RLS left disabled on every table;
--   * anon + authenticated granted full DML.
--
-- scripts/security/run_rls_matrix_local.sh applies this ONLY when
-- RLS_PROOF_UNHARDENED=1 and then asserts that the harness FAILS.
-- ============================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
