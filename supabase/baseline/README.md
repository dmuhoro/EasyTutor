# Baseline — BLOCKED in this cut

Building supabase/migrations/20261105000000_baseline.sql (whole schema on an empty
database) plus 01_seed.sql is a ~1500-line artefact that cannot be accurately
produced without executing prod's SQL catalog. Partial work intentionally not
committed to avoid a false baseline.

Omissions until implemented:
- all 34 tables carried across with FORCE RLS, ref tables as listed in
  docs/security/RLS_MATRIX.md
- functions handle_new_user, rls_auto_enable, search_path pinned, trigger on auth.users
- SECURITY DEFINER with search_path ''
- all indexes/policies
- 02_vector.sql split for pgvector when not available locally

NEXT: operator dumps prod schema (`pg_dump --schema-only`) and I reduce it into
a single baseline + baseline README of omitted tables.
