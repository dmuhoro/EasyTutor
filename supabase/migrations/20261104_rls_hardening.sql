-- ============================================================================
-- 20261104_rls_hardening.sql — canonical RLS hardening for every public table
--
-- ADDITIVE + IDEMPOTENT. Safe to re-run. Every statement is guarded by
-- to_regclass()/pg_catalog lookups so the migration applies cleanly whether the
-- environment is the full repo schema or an older cloud snapshot.
--
-- DOES NOT DROP TABLES AND DOES NOT DELETE DATA.
--
-- What it closes (see docs/security/RLS_MATRIX.md for the audited evidence):
--   1. Anon held full DML on every live table (docs/security/live-db-audit.txt).
--   2. "Public" (anon + authenticated) policies exposed owner rows whenever a
--      token was absent or the role check was the only gate.
--   3. ALL/UPDATE policies without WITH CHECK let an owner rewrite user_id and
--      hand a row to another account (or read it back through a forged owner).
--   4. RLS was enabled but never FORCED, so the table owner bypassed it.
--   5. Policies were duplicated across schema.sql + migrations with different
--      predicates; the weakest one won because policies are OR-ed.
--   6. SECURITY DEFINER / trigger functions had no fixed search_path and could
--      be hijacked through a caller-controlled schema.
--   7. Definer-style views ran with the view owner's privileges and bypassed
--      the caller's RLS (security_invoker was never set).
--
-- Canonical model created here (policy names are prefixed `et_` so rollback and
-- audits can identify exactly what this migration owns):
--   * user-owned table  : SELECT/INSERT/UPDATE/DELETE for `authenticated`,
--                         predicate (select auth.uid()) = <owner column>.
--   * append-only table : SELECT + INSERT only (no UPDATE/DELETE policy, and
--                         UPDATE/DELETE privileges are revoked).
--   * public reference  : SELECT for anon + authenticated; no writes.
--   * auth reference    : SELECT for authenticated; no anon, no writes.
--   * knowledge_chunks  : own rows OR shared corpus rows (user_id IS NULL);
--                         writes only to own rows.
--
-- Apply staging-first. See docs/security/SECURITY.md.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Helper: one place that knows how to (re)build a policy.
--    Risk closed: duplicated/weak policy drift. Every table ends with exactly
--    the canonical `et_` policy set and nothing else.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function pg_temp.et_drop_all_policies(target_table text)
returns void
language plpgsql
as $$
declare
  pol record;
begin
  for pol in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = target_table
  loop
    execute format('drop policy %I on public.%I', pol.policyname, target_table);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USER-OWNED TABLES — full owner CRUD.
--    Risk closed: cross-tenant read/write. An authenticated token can only see
--    and mutate rows whose owner column equals its own auth.uid(). The
--    `(select auth.uid())` form is evaluated once per statement instead of per
--    row (Supabase's documented RLS performance pattern).
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  spec record;
  tables text[][] := array[
    array['profiles',                 'id'],
    array['user_progress',            'user_id'],
    array['user_topic_progress',      'user_id'],
    array['quiz_sessions',            'user_id'],
    array['cached_roadmaps',          'user_id'],
    array['ai_feedback',              'user_id'],
    array['user_feedback',            'user_id'],
    array['ai_literacy_progress',     'user_id'],
    array['practice_sessions',        'user_id'],
    array['subject_mastery',          'user_id'],
    array['learning_recommendations', 'user_id'],
    array['performance_profiles',     'user_id'],
    array['learning_trend_snapshots', 'user_id'],
    array['learning_identities',      'user_id'],
    array['knowledge_paths',          'user_id'],
    array['learning_interventions',   'user_id'],
    array['learning_plans',           'user_id'],
    array['learning_risk_predictions', 'user_id'],
    array['learning_coach_reports',   'user_id'],
    array['learning_retention_profiles', 'user_id'],
    array['adaptive_learning_paths',  'user_id'],
    array['learning_goals',           'user_id'],
    array['documents',                'user_id'],
    array['document_chunks',          'user_id']
  ];
  i int;
  t text;
  owner_col text;
begin
  for i in 1 .. array_length(tables, 1) loop
    t := tables[i][1];
    owner_col := tables[i][2];

    -- Skip tables that this environment has not created yet. The guard keeps
    -- the migration applicable to older cloud snapshots without masking a
    -- failure on a table that does exist.
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'rls_hardening: skipping missing table %', t;
      continue;
    end if;

    perform pg_temp.et_drop_all_policies(t);

    -- Risk closed: authenticated callers inheriting the table owner's bypass.
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    -- Risk closed: anon (or PUBLIC) retaining table privileges even when RLS
    -- has no matching policy. Privileges are removed at the grant layer too.
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from public', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = %I)',
      'et_owner_select', t, owner_col);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = %I)',
      'et_owner_insert', t, owner_col);
    -- Risk closed: missing WITH CHECK. The old policies let an owner UPDATE a
    -- row and set owner_col to another user's id, planting a row they could no
    -- longer see but that the victim could.
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)',
      'et_owner_update', t, owner_col, owner_col);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = %I)',
      'et_owner_delete', t, owner_col);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. APPEND-ONLY TABLES — learner-facing audit trails.
--    Risk closed: an owner rewriting or erasing their own history, which would
--    destroy the integrity of evidence, analytics, and cost accounting. A
--    correction is a new row, never an in-place mutation.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array['learning_evidence', 'user_events', 'ai_call_logs'];
begin
  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'rls_hardening: skipping missing append-only table %', t;
      continue;
    end if;

    perform pg_temp.et_drop_all_policies(t);

    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from public', t);
    -- Risk closed: UPDATE/DELETE privileges surviving behind a future policy.
    execute format('revoke update, delete on table public.%I from authenticated', t);
    execute format('grant select, insert on table public.%I to authenticated', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = %I)',
      'et_append_select', t, 'user_id');
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = %I)',
      'et_append_insert', t, 'user_id');
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PUBLIC REFERENCE TABLES — curated, non-user content.
--    Risk closed: anon/authenticated writing to the curriculum. Read stays
--    public for the pre-auth catalog; every write path is closed.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array['subjects', 'topics', 'knowledge_nodes', 'legacy_subjects', 'legacy_topics'];
begin
  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'rls_hardening: skipping missing reference table %', t;
      continue;
    end if;

    perform pg_temp.et_drop_all_policies(t);

    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    -- Risk closed: reference tables being mutated by any client token.
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from public', t);
    execute format('revoke insert, update, delete on table public.%I from authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);

    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      'et_ref_read', t);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AUTHENTICATED-ONLY REFERENCE TABLES — assessment/curated content that
--    should not be exposed to a token-less caller.
--    Risk closed: anonymous scraping of the question bank and AI-literacy
--    answer keys; anonymous reads of the shared model-response cache.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array['question_bank', 'ai_literacy_content', 'cached_responses'];
begin
  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'rls_hardening: skipping missing auth-reference table %', t;
      continue;
    end if;

    perform pg_temp.et_drop_all_policies(t);

    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from public', t);
    execute format('revoke insert, update, delete on table public.%I from authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      'et_ref_read', t);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. KNOWLEDGE CHUNKS — mixed corpus: shared rows (user_id IS NULL) plus
--    learner-uploaded rows. Reads are scoped to "shared or mine"; writes are
--    owner-only.
--    Risk closed: one learner reading another learner's uploaded chunk while
--    keeping the shared curriculum corpus available to every account.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.knowledge_chunks') is null then
    raise notice 'rls_hardening: skipping missing table knowledge_chunks';
    return;
  end if;

  perform pg_temp.et_drop_all_policies('knowledge_chunks');

  alter table public.knowledge_chunks enable row level security;
  alter table public.knowledge_chunks force row level security;

  revoke all on table public.knowledge_chunks from anon;
  revoke all on table public.knowledge_chunks from public;
  grant select, insert, update, delete on table public.knowledge_chunks to authenticated;

  -- Risk closed: shared rows disappearing behind an owner-only predicate.
  create policy et_corpus_select on public.knowledge_chunks
    for select to authenticated
    using (user_id is null or (select auth.uid()) = user_id);
  -- Risk closed: planting chunks into another learner's corpus.
  create policy et_owner_insert on public.knowledge_chunks
    for insert to authenticated
    with check ((select auth.uid()) = user_id);
  create policy et_owner_update on public.knowledge_chunks
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  create policy et_owner_delete on public.knowledge_chunks
    for delete to authenticated
    using ((select auth.uid()) = user_id);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FUNCTION search_path isolation.
--    Risk closed: a SECURITY DEFINER or trigger function resolving an
--    unqualified object through a caller-controlled schema and executing it as
--    the owner (privilege escalation). Only functions that actually run with
--    elevated or trigger context are touched; pure SECURITY INVOKER helpers
--    (e.g. match_document_chunks) keep their path because forcing '' would
--    break their unqualified vector operator/table references without removing
--    any privilege they hold.
--    Extension-owned functions are excluded so the migration never edits an
--    extension's internals.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and (p.prosecdef or p.prorettype = 'trigger'::regtype)
       and not exists (
         select 1 from pg_depend d
          where d.objid = p.oid and d.deptype = 'e'
       )
  loop
    execute format('alter function %s set search_path = %L', fn.signature, '');
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VIEWS — run with the caller's privileges.
--    Risk closed: a definer-style view bypassing the caller's RLS and exposing
--    every tenant's operational metrics.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v record;
begin
  for v in
    select c.oid::regclass as rel
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'v'
       and not exists (
         select 1 from pg_depend d
          where d.objid = c.oid and d.deptype = 'e'
       )
  loop
    execute format('alter view %s set (security_invoker = true)', v.rel);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKETS.
--    The live audit returned `buckets: null` (the audit query did not run), so
--    no bucket can be asserted public or private from evidence. This migration
--    therefore refuses to guess: it fails closed by making any bucket that is
--    currently public private. Re-run the bucket audit in
--    docs/security/SECURITY.md after applying and confirm the expected set.
--    Guarded because plain Postgres / older projects have no storage schema.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'rls_hardening: storage schema absent, skipping bucket audit';
    return;
  end if;

  -- Risk closed: a public bucket serving learner uploads to anyone with a URL.
  update storage.buckets set public = false where public = true;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Post-conditions. The migration fails closed if the core guarantees did
--    not take effect, instead of reporting success while a table stayed open.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  bad text;
begin
  -- Every user-owned table that exists must have RLS enabled and forced.
  select string_agg(t, ', ')
    into bad
    from unnest(array[
      'profiles','user_progress','user_topic_progress','quiz_sessions',
      'cached_roadmaps','ai_feedback','user_feedback','ai_literacy_progress',
      'practice_sessions','subject_mastery','learning_recommendations',
      'performance_profiles','learning_trend_snapshots','learning_identities',
      'knowledge_paths','learning_interventions','learning_plans',
      'learning_risk_predictions','learning_coach_reports',
      'learning_retention_profiles','adaptive_learning_paths','learning_goals',
      'documents','document_chunks','learning_evidence','user_events',
      'ai_call_logs'
    ]) as t
   where to_regclass(format('public.%I', t)) is not null
     and not exists (
       select 1 from pg_class c
        where c.oid = to_regclass(format('public.%I', t))
          and c.relrowsecurity
          and c.relforcerowsecurity
     );

  if bad is not null then
    raise exception 'rls_hardening: RLS not enabled+forced on: %', bad;
  end if;

  -- No `anon` policy may exist on a user-owned table.
  select string_agg(tablename || '.' || policyname, ', ')
    into bad
    from pg_policies
   where schemaname = 'public'
     and 'anon' = any(roles)
     and tablename = any(array[
       'profiles','user_progress','user_topic_progress','quiz_sessions',
       'cached_roadmaps','ai_feedback','user_feedback','ai_literacy_progress',
       'practice_sessions','subject_mastery','learning_recommendations',
       'performance_profiles','learning_trend_snapshots','learning_identities',
       'knowledge_paths','learning_interventions','learning_plans',
       'learning_risk_predictions','learning_coach_reports',
       'learning_retention_profiles','adaptive_learning_paths','learning_goals',
       'documents','document_chunks','learning_evidence','user_events',
       'ai_call_logs'
     ]);

  if bad is not null then
    raise exception 'rls_hardening: anon policy still present on user table(s): %', bad;
  end if;
end;
$$;

-- The helper lives only for this session.
drop function if exists pg_temp.et_drop_all_policies(text);

comment on schema public is
  'RLS hardened 2026-11-04: owner-scoped policies, forced RLS, append-only audit trails. See docs/security/SECURITY.md.';
