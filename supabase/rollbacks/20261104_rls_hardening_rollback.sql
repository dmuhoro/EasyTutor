-- ============================================================================
-- 20261104_rls_hardening_rollback.sql — emergency rollback
--
-- ⚠️  THIS FILE IS NOT A MIGRATION AND MUST NEVER BE APPLIED AUTOMATICALLY.
--     It lives outside supabase/migrations/ on purpose. Apply it only by hand,
--     only to unblock an incident introduced by 20261104_rls_hardening.sql.
--
-- WHAT IT DOES
--   * removes every policy created by the hardening migration (`et_*`);
--   * removes FORCE RLS;
--   * restores the pre-hardening grant surface from docs/security/live-db-audit.txt
--     (anon held full DML on user tables — this is the audited vulnerability);
--   * restores the pre-hardening baseline policies that existed in the repo.
--
-- ⚠️  THE RESULT IS DELIBERATELY INSECURE. After rolling back, re-apply the
--     hardening migration as soon as the incident is understood. Do not leave an
--     environment in this state: every table it touches is exposed to anon.
--
-- It is idempotent: safe to re-run.
-- ============================================================================

begin;

-- 1. Drop every hardening policy.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and (policyname like 'et\_%' escape '\'
            or policyname like 'rollback\_%' escape '\')
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end;
$$;

-- 2. Remove FORCE RLS (keep ENABLE, matching the audited live state).
do $$
declare
  t text;
  tables text[] := array[
    'profiles','user_progress','user_topic_progress','quiz_sessions',
    'cached_roadmaps','ai_feedback','user_feedback','ai_literacy_progress',
    'practice_sessions','subject_mastery','learning_recommendations',
    'performance_profiles','learning_trend_snapshots','learning_identities',
    'knowledge_paths','learning_interventions','learning_plans',
    'learning_risk_predictions','learning_coach_reports',
    'learning_retention_profiles','adaptive_learning_paths','learning_goals',
    'documents','document_chunks','learning_evidence','user_events',
    'ai_call_logs','knowledge_chunks','subjects','topics','question_bank',
    'ai_literacy_content','knowledge_nodes','cached_responses'
  ];
begin
  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I no force row level security', t);
    end if;
  end loop;
end;
$$;

-- 3. Restore the pre-hardening grant surface.
--    Risk accepted only because this is an emergency rollback: anon regains
--    DML on user-owned tables, exactly as the live audit recorded it.
do $$
declare
  t text;
  user_tables text[] := array[
    'profiles','user_progress','user_topic_progress','quiz_sessions',
    'cached_roadmaps','ai_feedback','user_feedback','ai_literacy_progress',
    'practice_sessions','subject_mastery','learning_recommendations',
    'performance_profiles','learning_trend_snapshots','learning_identities',
    'knowledge_paths','learning_interventions','learning_plans',
    'learning_risk_predictions','learning_coach_reports',
    'learning_retention_profiles','adaptive_learning_paths','learning_goals',
    'documents','document_chunks','knowledge_chunks','cached_responses'
  ];
  append_only text[] := array['learning_evidence', 'user_events', 'ai_call_logs'];
  reference text[] := array['subjects', 'topics', 'question_bank', 'ai_literacy_content', 'knowledge_nodes'];
begin
  foreach t in array user_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('grant select, insert, update, delete on table public.%I to anon', t);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    end if;
  end loop;

  foreach t in array append_only loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('grant select, insert on table public.%I to anon, authenticated', t);
    end if;
  end loop;

  foreach t in array reference loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('grant select on table public.%I to anon, authenticated', t);
    end if;
  end loop;
end;
$$;

-- 4. Restore the repo baseline policies (weak by design — see file header).
do $$
declare
  spec record;
  user_owned text[][] := array[
    array['profiles', 'id'],
    array['user_progress', 'user_id'],
    array['user_topic_progress', 'user_id'],
    array['quiz_sessions', 'user_id'],
    array['cached_roadmaps', 'user_id'],
    array['ai_feedback', 'user_id'],
    array['user_feedback', 'user_id'],
    array['ai_literacy_progress', 'user_id'],
    array['practice_sessions', 'user_id'],
    array['subject_mastery', 'user_id'],
    array['learning_recommendations', 'user_id'],
    array['performance_profiles', 'user_id'],
    array['learning_trend_snapshots', 'user_id'],
    array['learning_identities', 'user_id'],
    array['knowledge_paths', 'user_id'],
    array['learning_interventions', 'user_id'],
    array['learning_plans', 'user_id'],
    array['learning_risk_predictions', 'user_id'],
    array['learning_coach_reports', 'user_id'],
    array['learning_retention_profiles', 'user_id'],
    array['adaptive_learning_paths', 'user_id'],
    array['learning_goals', 'user_id'],
    array['documents', 'user_id'],
    array['document_chunks', 'user_id'],
    array['knowledge_chunks', 'user_id']
  ];
  i int;
begin
  for i in 1 .. array_length(user_owned, 1) loop
    if to_regclass(format('public.%I', user_owned[i][1])) is not null then
      execute format(
        'create policy %I on public.%I for all to public using ((select auth.uid()) = %I)',
        'rollback_owner_all', user_owned[i][1], user_owned[i][2]);
    end if;
  end loop;
end;
$$;

-- learning_evidence was append-only before hardening.
do $$
begin
  if to_regclass('public.learning_evidence') is not null then
    create policy rollback_evidence_select on public.learning_evidence
      for select to public using ((select auth.uid()) = user_id);
    create policy rollback_evidence_insert on public.learning_evidence
      for insert to public with check ((select auth.uid()) = user_id);
  end if;
end;
$$;

-- user_events / ai_call_logs were insert-only before hardening.
do $$
declare
  t text;
begin
  foreach t in array array['user_events', 'ai_call_logs'] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
        'rollback_append_insert', t);
    end if;
  end loop;
end;
$$;

-- Public reference reads: subjects/topics/knowledge_nodes were `true`;
-- question_bank/ai_literacy_content gated on an authenticated role.
do $$
begin
  if to_regclass('public.subjects') is not null then
    create policy rollback_public_read on public.subjects for select to public using (true);
  end if;
  if to_regclass('public.topics') is not null then
    create policy rollback_public_read on public.topics for select to public using (true);
  end if;
  if to_regclass('public.knowledge_nodes') is not null then
    create policy rollback_public_read on public.knowledge_nodes for select to public using (true);
  end if;
  if to_regclass('public.question_bank') is not null then
    create policy rollback_public_read on public.question_bank for select to public using (auth.role() = 'authenticated');
  end if;
  if to_regclass('public.ai_literacy_content') is not null then
    create policy rollback_public_read on public.ai_literacy_content for select to authenticated using (true);
  end if;
end;
$$;

-- 5. Restore function/view defaults.
do $$
declare
  fn record;
  v record;
begin
  for fn in
    select p.oid::regprocedure as signature
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and (p.prosecdef or p.prorettype = 'trigger'::regtype)
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('alter function %s reset search_path', fn.signature);
  end loop;

  for v in
    select c.oid::regclass as rel
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v'
       and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
  loop
    execute format('alter view %s reset (security_invoker)', v.rel);
  end loop;
end;
$$;

-- 6. Storage buckets are NOT re-published. A rollback may unblock a broken
--    policy, but intentionally re-opening learner uploads to the public
--    internet is never an acceptable side effect.

commit;

-- ⚠️  Re-apply supabase/migrations/20261104_rls_hardening.sql immediately after
--     the incident is resolved.
