-- ============================================================================
-- Learning evidence RLS verification (real PostgreSQL, real policies)
--
-- Runs against the official Supabase Postgres image, which provides the
-- `auth` schema, `auth.uid()`, and the anon/authenticated/service_role roles.
--
-- Usage:
--   ./scripts/security/run_evidence_rls_tests.sh
--
-- The script applies both evidence migrations, then exercises the policies as
-- two distinct authenticated learners plus an anonymous role. Any failed
-- assertion aborts with a non-zero exit code.
-- ============================================================================

\set ON_ERROR_STOP on

-- ── Fixtures ────────────────────────────────────────────────────────────────
insert into auth.users (id, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'learner.a@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'learner.b@example.test')
on conflict (id) do nothing;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is distinct from true then
    raise exception 'ASSERTION FAILED: %', message;
  end if;
end;
$$;

create or replace function pg_temp.set_learner(learner uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', learner::text, false);
end;
$$;

-- ── Schema verification ─────────────────────────────────────────────────────
do $$
declare
  missing text[] := array[]::text[];
begin
  if to_regclass('public.learning_evidence') is null then
    missing := missing || 'table learning_evidence';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='learning_evidence' and column_name='subject_id') then
    missing := missing || 'column subject_id';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='learning_evidence' and column_name='curriculum_ref') then
    missing := missing || 'column curriculum_ref';
  end if;
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='learning_evidence'
      and indexname='learning_evidence_user_skill_idx'
  ) then
    missing := missing || 'index learning_evidence_user_skill_idx';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.learning_evidence'::regclass
      and contype='u'
      and pg_get_constraintdef(oid) like '%user_id, client_event_id%'
  ) then
    missing := missing || 'unique(user_id, client_event_id)';
  end if;
  if not exists (select 1 from pg_tables where schemaname='public' and tablename='learning_evidence' and rowsecurity) then
    missing := missing || 'row level security enabled';
  end if;
  if array_length(missing, 1) is not null then
    raise exception 'SCHEMA INCOMPLETE: %', array_to_string(missing, ', ');
  end if;
end;
$$;

-- ── Helper: evidence insert as the current role ─────────────────────────────
create or replace function pg_temp.insert_evidence(
  owner uuid,
  event_id text,
  score numeric default 1.0
) returns void
language sql
as $$
  insert into public.learning_evidence
    (user_id, client_event_id, subject_id, skill_id, activity_id, dimension, score, independent, hints, provenance)
  values
    (owner, event_id, 'mathematics', 'fractions', 'diagnostic-v1', 'application', score, true, 0, 'learner_action');
$$;

-- ── Test 1: learner A inserts and reads only their own evidence ─────────────
select pg_temp.set_learner('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
set role authenticated;

select pg_temp.insert_evidence('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a-event-1');

select pg_temp.assert_true(
  (select count(*) from public.learning_evidence) = 1,
  'learner A sees exactly their own record'
);

reset role;

-- ── Test 2: learner B cannot see learner A's evidence ──────────────────────
select pg_temp.set_learner('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
set role authenticated;

select pg_temp.assert_true(
  (select count(*) from public.learning_evidence) = 0,
  'learner B cannot read learner A evidence'
);

select pg_temp.insert_evidence('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b-event-1');

select pg_temp.assert_true(
  (select count(*) from public.learning_evidence) = 1,
  'learner B sees exactly their own record'
);

reset role;

-- ── Test 3: learner A cannot insert evidence for learner B ─────────────────
select pg_temp.set_learner('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
set role authenticated;

do $$
begin
  begin
    perform pg_temp.insert_evidence('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'forged-owner');
    raise exception 'ASSERTION FAILED: cross-learner insert was accepted';
  exception
    when insufficient_privilege then null; -- expected: RLS WITH CHECK rejection
  end;
end;
$$;

reset role;

-- ── Test 4: learner A cannot update or delete learner B's evidence ────────
select pg_temp.set_learner('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
set role authenticated;

do $$
begin
  begin
    update public.learning_evidence set score = 0.1 where client_event_id = 'b-event-1';
    raise exception 'ASSERTION FAILED: cross-learner update was accepted';
  exception
    when insufficient_privilege then null; -- expected: privilege revoked (append-only)
  end;

  begin
    delete from public.learning_evidence where client_event_id = 'b-event-1';
    raise exception 'ASSERTION FAILED: cross-learner delete was accepted';
  exception
    when insufficient_privilege then null; -- expected: privilege revoked (append-only)
  end;
end;
$$;

-- Append-only for the learner's own rows as well.
do $$
begin
  begin
    update public.learning_evidence set score = 0.0 where client_event_id = 'a-event-1';
    raise exception 'ASSERTION FAILED: learner mutated accepted evidence in place';
  exception
    when insufficient_privilege then null; -- expected
  end;
end;
$$;

reset role;

-- ── Test 5: anonymous role is denied ───────────────────────────────────────
-- An anonymous request carries no subject claim.
select set_config('request.jwt.claim.sub', '', false);
set role anon;

select pg_temp.assert_true(
  (select count(*) from public.learning_evidence) = 0,
  'anonymous role cannot read private evidence'
);

do $$
begin
  begin
    insert into public.learning_evidence
      (user_id, client_event_id, subject_id, skill_id, activity_id, dimension, score, independent, hints)
    values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'anon-event', 'mathematics', 'fractions', 'diagnostic-v1', 'application', 1, true, 0);
    raise exception 'ASSERTION FAILED: anonymous insert was accepted';
  exception
    when insufficient_privilege then null; -- expected
  end;
end;
$$;

reset role;

-- ── Test 6: duplicate client event ids are rejected (writer maps to success) ─
select pg_temp.set_learner('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
set role authenticated;

do $$
begin
  begin
    perform pg_temp.insert_evidence('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a-event-1');
    raise exception 'ASSERTION FAILED: duplicate (user_id, client_event_id) was accepted';
  exception
    when unique_violation then null; -- expected
  end;
end;
$$;

-- ── Test 7: invalid evidence is rejected by constraints ───────────────────
do $$
begin
  begin
    perform pg_temp.insert_evidence('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bad-score', 1.5);
    raise exception 'ASSERTION FAILED: out-of-range score was accepted';
  exception
    when check_violation then null; -- expected
  end;
end;
$$;

do $$
begin
  begin
    insert into public.learning_evidence
      (user_id, client_event_id, subject_id, skill_id, activity_id, dimension, score, independent, hints, provenance)
    values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bad-provenance', 'mathematics', 'fractions', 'diagnostic-v1', 'application', 1, true, 0, 'learner_claim');
    raise exception 'ASSERTION FAILED: unsupported provenance was accepted';
  exception
    when check_violation then null; -- expected
  end;
end;
$$;

do $$
begin
  begin
    insert into public.learning_evidence
      (user_id, client_event_id, subject_id, skill_id, activity_id, dimension, score, independent, hints)
    values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bad-dimension', 'mathematics', 'fractions', 'diagnostic-v1', 'guessing', 1, true, 0);
    raise exception 'ASSERTION FAILED: unsupported dimension was accepted';
  exception
    when check_violation then null; -- expected
  end;
end;
$$;

reset role;

-- ── Test 8: trusted service role retains administrative visibility ─────────
set role service_role;
select pg_temp.assert_true(
  (select count(*) from public.learning_evidence) = 2,
  'service role can read all evidence for trusted operations'
);
reset role;

\echo '✅ RLS verification passed: isolation, append-only, anonymous denial, idempotency, constraints.'
