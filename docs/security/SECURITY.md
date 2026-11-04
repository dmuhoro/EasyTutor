# EasyTutor — Security Posture

Single owner: daniel-muhoro. This document reflects the 2026-11-04 hardening cut.

## Threat model (v1)
- Directives: anonymous users hitting REST/PostgREST, cross-tenant reads/writes,
  students re-homing rows, deleting their own audit trail, scraping the question
  bank / AI-literacy answer keys, planting content in shared corpora, and
  client-side credential leakage (`EXPO_PUBLIC_*` bundles, service-role client).
- Out of scope: provider prompt-injection, XSS via content, DoS, and physical
  device security.

## Decisions made
1. One set of owner-scoped policies per table (`et_*`), all `FOR ... TO authenticated` with
   `(select auth.uid()) = <owner>` (Supabase performance form).
2. `WITH CHECK` on every INSERT/UPDATE; the UPDATE policy gates `USING` and
   `WITH CHECK` independently so a row cannot be re-homed.
3. RLS is not just enabled but **forced** (`ALTER ... FORCE ROW LEVEL SECURITY`) —
   table owner can no longer bypass RLS.
4. Privileges removed at the grant layer so a future policy would still be gated
   by the missing privilege.
5. Audit trails (`learning_evidence`, `user_events`, `ai_call_logs`) are append-only:
   UPDATE/DELETE held neither policy nor grant.
6. Public reference tables (subjects/topics/knowledge_nodes) remain readable by
   anon for the pre-auth catalog; nothing is writable by clients.
7. `question_bank`, `ai_literacy_content`, `cached_responses` are authenticated-only.
8. Mixed knowledge corpus remains shared-but-owned.
9. `search_path=''` for all `SECURITY DEFINER` and trigger functions;
   all non-extension views become `security_invoker=true`.
10. All buckets currently public become private (`update storage.buckets set public=false
    where public`). Add/whitelist buckets explicitly in SECURITY.md after review
    (live bucket audit was `null`).
11. Client-facing Anthropic rail removed; Groq remains with an explicit TEMP
    allowlist entry (guard emits a warning until the server-side proxy lands).
12. Server-only credentials never shipped: `guard:secret-exposure` and
    `guard:public-env` (see package.json) wired into CI.
13. Borrowed `EXPO_PUBLIC_GROQ_API_KEY` (client-exposed) is a known, tracked
    exposure. Follow-up: add a server-side proxy.

## Operator checklist — apply to staging first
1. `psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261104_rls_hardening.sql`
2. Re-run `node scripts/security/run_rls_matrix_staging.sh` (must reach 247/247 PASS,
   or report why each BLOCKED row cannot).
3. Run the rollback once on the throwaway fixture (already done) and again in
   staging only in an incident.
4. Apply to production only after staging is clean; tag the commit.
5. Run `node scripts/security/check_secret_exposure.mjs --include-dist` on the
   exported bundle before release.
6. Rotate any key that ever landed in `.env.example` or a commit message
   (currently none committed; treat as preventative).

## Key rotation / secrets handling
- Secrets live in `.env*.local` (gitignored) locally and in the secret manager
  in hosted environments. Never commit; `guard:secret-exposure` blocks CI.
- All `.env` access is by existence check only; values are never printed.
- If a live key is ever revealed: assume compromise, rotate immediately, then
  clean history — rotation is the remedy.

## Evidence references
- RLS matrix: `docs/security/RLS_MATRIX.md`.
- Live snapshot: `docs/security/live-db-audit.txt` (uncommitted; operator regenerates).
- Local proof: `docs/evidence/` (per sprint convention) — `247/247 PASS` after
  hardening, `177/247 FAIL` before.
- Migration chain audit: `scripts/security/proof_migration_chain.sh`.

## Rollback
See `supabase/rollbacks/20261104_rls_hardening_rollback.sql`. Disables forced
RLS, restores the (insecure) pre-hardening grants and policies. Only for
incidents introduce by this migration; re-apply immediately after resolution.