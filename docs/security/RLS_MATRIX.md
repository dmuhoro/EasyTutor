# EasyTutor — RLS Matrix (security hardening 2026-11-04)

Source-of-truth for `supabase/migrations/20261104_rls_hardening.sql`. Every
public table is classified into exactly one kind; each kind maps 1:1 to the
PostgREST verbs a caller may use and the policy that authorises them.

## Kinds (whole schema)

| Kind | Verbs (authenticated) | Verbs (anon) | Row predicate |
| --- | --- | --- | --- |
| `user` | SELECT / INSERT / UPDATE / DELETE | none | owner column = `(select auth.uid())` |
| `append` (audit trail) | SELECT / INSERT | none | same; UPDATE and DELETE revoked at grant layer |
| `corpus` | SELECT (shared + own) / INSERT / UPDATE / DELETE on own | none | `user_id IS NULL OR user_id = auth.uid()` |
| `public_ref` | SELECT | SELECT | `true` |
| `auth_ref` | SELECT | none | `true` |

## User-owned tables (class `user`)
`profiles` (owner `id`), `user_progress`, `user_topic_progress`,
`quiz_sessions`, `cached_roadmaps`, `ai_feedback`, `user_feedback`,
`ai_literacy_progress`, `practice_sessions`, `subject_mastery`,
`learning_recommendations`, `performance_profiles`,
`learning_trend_snapshots`, `learning_identities`, `knowledge_paths`,
`learning_interventions`, `learning_plans`, `learning_risk_predictions`,
`learning_coach_reports`, `learning_retention_profiles`,
`adaptive_learning_paths`, `learning_goals`, `documents`,
`document_chunks` (owner `user_id`).

Each gets four `et_owner_*` policies, a `WITH CHECK` on INSERT and UPDATE
(so a row cannot be re-homed to another owner), and forced RLS.

## Append-only tables (class `append`)
`learning_evidence`, `user_events`, `ai_call_logs`. SELECT + INSERT only;
UPDATE/DELETE are revoked at the grant layer so even a future policy cannot
revive the right.

## Mixed corpus (class `corpus`)
`knowledge_chunks`. Reads see shared corpus (`user_id IS NULL`) plus owned
rows; every write is owner-only with `WITH CHECK`.

## Public reference (class `public_ref`)
`subjects`, `topics`, `knowledge_nodes` — SELECT for anon + authenticated;
no writes (grants revoked).

## Authenticated reference (class `auth_ref`)
`question_bank`, `ai_literacy_content`, `cached_responses` — SELECT for
authenticated only; no anon; no writes. Anonymous banner/test traffic can no
longer scrape the question bank or hit the answer-key-bearing literacy tables.

## Coverage and row-level evidence
- 34 user/public tables, every one has RLS **enabled and forced**.
- every user-owned table has exactly four `et_*` policies (et_owner_select,
  et_owner_insert, et_owner_update, et_owner_delete); `et_owner_update`
  carries `WITH CHECK`.
- no policy grants anon access to a user-owned table.
- anonymous reads of `auth_ref` and anonymous writes of `public_ref` are denied.
- storage: every currently-public bucket is made private (fail-closed; bucket
  audit was `null` in the live snapshot, so no corner is assumed safe).
- SECURITY DEFINER / trigger functions in `public` get `search_path=''` and are
  not extension-owned internals.
- all non-extension views in `public` become `security_invoker = true`.

## Verification commands (run as governance gates)
- `RLS_PROOF_UNHARDENED=1 bash scripts/security/run_rls_matrix_local.sh` →
  **247/247 FAIL** (proves the harness detects the vulnerability).
- `bash scripts/security/run_rls_matrix_local.sh` → **247/247 PASS**.
- `node scripts/security/run_rls_matrix_staging.sh` runs the identical
  assertions against staging (after the operator applies the migration).

## Notes
- This matrix matches the `to_regclass`-guarded migration; an environment
  missing a table receives a NOTICE and is skipped, so older snapshots apply
  cleanly without masking a failure on the tables that do exist.
- Real RLS values come from `docs/security/live-db-audit.txt` (gitignored
  artifact of the live snapshot; never committed with credential values inside).