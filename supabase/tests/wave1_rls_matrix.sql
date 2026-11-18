-- W1-3 RLS matrix harness (Wave 1 truth pass).
-- Prerequisites: a throwaway Supabase PG 17 DB with canonical supabase/schema.sql
-- applied first, then all supabase/migrations/*.sql. Never run on a real project.
-- Run: docker cp <this file> <container>:/tmp/rls_matrix.sql
--      docker exec <container> psql -U postgres -d postgres -f /tmp/rls_matrix.sql
-- Expected: RLS_MATRIX_SUMMARY total=104 fails=0 (the DO block raises on any mismatch).

-- Generated RLS matrix harness (W1-3). Expected results are encoded in cases.
\set ON_ERROR_STOP on
BEGIN;

-- 1) SEED (as postgres; RLS bypassed)
DELETE FROM document_chunks; DELETE FROM documents; DELETE FROM user_progress;
DELETE FROM quiz_sessions; DELETE FROM ai_daily_usage; DELETE FROM learning_goals;
DELETE FROM profiles;
DELETE FROM auth.users WHERE id IN ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
DELETE FROM legacy_topics WHERE id IN ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
DELETE FROM legacy_subjects WHERE id = 'rlssub';
INSERT INTO legacy_subjects(id,name,level) VALUES('rlssub','RLS Subject','high_school');
INSERT INTO legacy_topics(id,subject_id,title) VALUES('00000000-0000-4000-8000-000000000001','rlssub','RLS Topic 1'),('00000000-0000-4000-8000-000000000002','rlssub','RLS Topic 2');
INSERT INTO auth.users(id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
INSERT INTO documents(id,user_id,title) VALUES('10000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A doc'),('10000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B doc');
INSERT INTO document_chunks(id,user_id,content,curriculum_scope) VALUES('60000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A chunk','USER_PRIVATE'),('60000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B chunk','USER_PRIVATE');
INSERT INTO user_progress(id,user_id,subject_id,topic_id) VALUES('20000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','rlssub','00000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','rlssub','00000000-0000-4000-8000-000000000001');
INSERT INTO quiz_sessions(id,user_id,subject_id,topic_id) VALUES('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','rlssub','00000000-0000-4000-8000-000000000001'),('30000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','rlssub','00000000-0000-4000-8000-000000000001');
INSERT INTO learning_goals(id,user_id,topic,data) VALUES('50000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A goal','{}'::jsonb),('50000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B goal','{}'::jsonb);
INSERT INTO ai_daily_usage(user_id,call_date,call_count) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2020-01-01',1),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2020-01-01',1);
INSERT INTO profiles(id,email) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','a@x'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','b@x');  -- UE intentionally has NO profile (INSERT self test)

-- 2) MATRIX
DO $do$
DECLARE
  c record; v_result int; v_denied boolean; v_state text; v_msg text;
  v_obs text; v_verdict text; v_detail text; v_fails int := 0; v_total int := 0;
BEGIN
  -- SELECT|anon|documents
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.documents$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|anon|documents | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|A|documents
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.documents$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|A|documents | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|B|documents
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.documents$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|B|documents | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|anon|document_chunks
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.document_chunks$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|anon|document_chunks | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|A|document_chunks
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.document_chunks$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|A|document_chunks | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|B|document_chunks
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.document_chunks$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|B|document_chunks | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|anon|user_progress
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.user_progress$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|anon|user_progress | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|A|user_progress
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.user_progress$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|A|user_progress | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|B|user_progress
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.user_progress$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|B|user_progress | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|anon|quiz_sessions
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.quiz_sessions$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|anon|quiz_sessions | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|A|quiz_sessions
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.quiz_sessions$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|A|quiz_sessions | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|B|quiz_sessions
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.quiz_sessions$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|B|quiz_sessions | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|anon|learning_goals
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.learning_goals$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|anon|learning_goals | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|A|learning_goals
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.learning_goals$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|A|learning_goals | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|B|learning_goals
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.learning_goals$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|B|learning_goals | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|anon|ai_daily_usage
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.ai_daily_usage$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|anon|ai_daily_usage | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|A|ai_daily_usage
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.ai_daily_usage$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|A|ai_daily_usage | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|B|ai_daily_usage
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.ai_daily_usage$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|B|ai_daily_usage | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|anon|profiles
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.profiles$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|anon|profiles | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|A|profiles
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.profiles$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|A|profiles | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- SELECT|B|profiles
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$SELECT count(*)::int FROM public.profiles$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | SELECT|B|profiles | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|anon|documents|owner=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.documents(user_id,title) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','probe-insert') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|anon|documents|owner=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|documents|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.documents(user_id,title) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','probe-insert') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|documents|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|documents|owner=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.documents(user_id,title) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','probe-insert') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|documents|owner=B | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|B|documents|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.documents(user_id,title) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','probe-insert') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|B|documents|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|anon|document_chunks|owner=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.document_chunks(user_id,content) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','probe-insert') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|anon|document_chunks|owner=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|document_chunks|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.document_chunks(user_id,content) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','probe-insert') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|document_chunks|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|document_chunks|owner=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.document_chunks(user_id,content) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','probe-insert') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|document_chunks|owner=B | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|B|document_chunks|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.document_chunks(user_id,content) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','probe-insert') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|B|document_chunks|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|anon|user_progress|owner=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.user_progress(user_id,subject_id,topic_id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','rlssub','00000000-0000-4000-8000-000000000002') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|anon|user_progress|owner=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|user_progress|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.user_progress(user_id,subject_id,topic_id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','rlssub','00000000-0000-4000-8000-000000000002') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|user_progress|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|user_progress|owner=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.user_progress(user_id,subject_id,topic_id) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','rlssub','00000000-0000-4000-8000-000000000002') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|user_progress|owner=B | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|B|user_progress|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.user_progress(user_id,subject_id,topic_id) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','rlssub','00000000-0000-4000-8000-000000000002') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|B|user_progress|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|anon|quiz_sessions|owner=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.quiz_sessions(user_id,subject_id,topic_id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','rlssub','00000000-0000-4000-8000-000000000001') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|anon|quiz_sessions|owner=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|quiz_sessions|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.quiz_sessions(user_id,subject_id,topic_id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','rlssub','00000000-0000-4000-8000-000000000001') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|quiz_sessions|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|quiz_sessions|owner=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.quiz_sessions(user_id,subject_id,topic_id) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','rlssub','00000000-0000-4000-8000-000000000001') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|quiz_sessions|owner=B | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|B|quiz_sessions|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.quiz_sessions(user_id,subject_id,topic_id) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','rlssub','00000000-0000-4000-8000-000000000001') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|B|quiz_sessions|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|anon|learning_goals|owner=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.learning_goals(user_id,topic,data) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','probe-insert','{}'::jsonb) RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|anon|learning_goals|owner=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|learning_goals|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.learning_goals(user_id,topic,data) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','probe-insert','{}'::jsonb) RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|learning_goals|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|learning_goals|owner=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.learning_goals(user_id,topic,data) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','probe-insert','{}'::jsonb) RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|learning_goals|owner=B | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|B|learning_goals|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.learning_goals(user_id,topic,data) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','probe-insert','{}'::jsonb) RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|B|learning_goals|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|anon|ai_daily_usage|owner=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.ai_daily_usage(user_id,call_date,call_count) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2099-01-01',0) RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|anon|ai_daily_usage|owner=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|ai_daily_usage|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.ai_daily_usage(user_id,call_date,call_count) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2099-01-01',0) RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|ai_daily_usage|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|ai_daily_usage|owner=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.ai_daily_usage(user_id,call_date,call_count) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2099-01-01',0) RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|ai_daily_usage|owner=B | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|B|ai_daily_usage|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.ai_daily_usage(user_id,call_date,call_count) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2099-01-01',0) RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|B|ai_daily_usage|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|anon|profiles|owner=E
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.profiles(id,email) VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','e@x') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|anon|profiles|owner=E | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|E|profiles|self
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.profiles(id,email) VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','e@x') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|E|profiles|self | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- INSERT|A|profiles|owner=E
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (INSERT INTO public.profiles(id,email) VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','e@x') RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | INSERT|A|profiles|owner=E | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|anon|documents|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.documents SET title='probe-upd' WHERE id='10000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|anon|documents|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|documents|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.documents SET title='probe-upd' WHERE id='10000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|documents|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|documents|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.documents SET title='probe-upd' WHERE id='10000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|documents|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|B|documents|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.documents SET title='probe-upd' WHERE id='10000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|B|documents|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|anon|document_chunks|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.document_chunks SET content='probe-upd' WHERE id='60000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|anon|document_chunks|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|document_chunks|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.document_chunks SET content='probe-upd' WHERE id='60000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|document_chunks|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|document_chunks|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.document_chunks SET content='probe-upd' WHERE id='60000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|document_chunks|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|B|document_chunks|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.document_chunks SET content='probe-upd' WHERE id='60000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|B|document_chunks|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|anon|user_progress|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.user_progress SET attempts=99 WHERE id='20000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|anon|user_progress|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|user_progress|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.user_progress SET attempts=99 WHERE id='20000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|user_progress|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|user_progress|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.user_progress SET attempts=99 WHERE id='20000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|user_progress|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|B|user_progress|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.user_progress SET attempts=99 WHERE id='20000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|B|user_progress|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|anon|quiz_sessions|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.quiz_sessions SET score=99 WHERE id='30000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|anon|quiz_sessions|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|quiz_sessions|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.quiz_sessions SET score=99 WHERE id='30000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|quiz_sessions|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|quiz_sessions|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.quiz_sessions SET score=99 WHERE id='30000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|quiz_sessions|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|B|quiz_sessions|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.quiz_sessions SET score=99 WHERE id='30000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|B|quiz_sessions|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|anon|learning_goals|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.learning_goals SET topic='probe-upd' WHERE id='50000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|anon|learning_goals|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|learning_goals|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.learning_goals SET topic='probe-upd' WHERE id='50000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|learning_goals|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|learning_goals|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.learning_goals SET topic='probe-upd' WHERE id='50000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|learning_goals|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|B|learning_goals|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.learning_goals SET topic='probe-upd' WHERE id='50000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|B|learning_goals|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|anon|ai_daily_usage|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.ai_daily_usage SET call_count=99 WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND call_date='2020-01-01' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|anon|ai_daily_usage|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|ai_daily_usage|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.ai_daily_usage SET call_count=99 WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND call_date='2020-01-01' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|ai_daily_usage|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|ai_daily_usage|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.ai_daily_usage SET call_count=99 WHERE user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND call_date='2020-01-01' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|ai_daily_usage|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|B|ai_daily_usage|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.ai_daily_usage SET call_count=99 WHERE user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND call_date='2020-01-01' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|B|ai_daily_usage|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|anon|profiles|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.profiles SET email='upd@x' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|anon|profiles|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|profiles|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.profiles SET email='upd@x' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|profiles|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|A|profiles|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.profiles SET email='upd@x' WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|A|profiles|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- UPDATE|B|profiles|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (UPDATE public.profiles SET email='upd@x' WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | UPDATE|B|profiles|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|anon|documents|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.documents WHERE id='10000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|anon|documents|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|documents|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.documents WHERE id='10000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|documents|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|documents|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.documents WHERE id='10000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|documents|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|B|documents|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.documents WHERE id='10000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|B|documents|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|anon|document_chunks|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.document_chunks WHERE id='60000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|anon|document_chunks|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|document_chunks|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.document_chunks WHERE id='60000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|document_chunks|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|document_chunks|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.document_chunks WHERE id='60000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|document_chunks|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|B|document_chunks|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.document_chunks WHERE id='60000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|B|document_chunks|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|anon|user_progress|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.user_progress WHERE id='20000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|anon|user_progress|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|user_progress|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.user_progress WHERE id='20000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|user_progress|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|user_progress|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.user_progress WHERE id='20000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|user_progress|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|B|user_progress|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.user_progress WHERE id='20000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|B|user_progress|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|anon|quiz_sessions|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.quiz_sessions WHERE id='30000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|anon|quiz_sessions|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|quiz_sessions|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.quiz_sessions WHERE id='30000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|quiz_sessions|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|quiz_sessions|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.quiz_sessions WHERE id='30000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|quiz_sessions|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|B|quiz_sessions|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.quiz_sessions WHERE id='30000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|B|quiz_sessions|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|anon|learning_goals|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.learning_goals WHERE id='50000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|anon|learning_goals|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|learning_goals|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.learning_goals WHERE id='50000000-0000-4000-8000-000000000001' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|learning_goals|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|learning_goals|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.learning_goals WHERE id='50000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|learning_goals|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|B|learning_goals|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.learning_goals WHERE id='50000000-0000-4000-8000-000000000002' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|B|learning_goals|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|anon|ai_daily_usage|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.ai_daily_usage WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND call_date='2020-01-01' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|anon|ai_daily_usage|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|ai_daily_usage|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.ai_daily_usage WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND call_date='2020-01-01' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|ai_daily_usage|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|ai_daily_usage|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.ai_daily_usage WHERE user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND call_date='2020-01-01' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|ai_daily_usage|row=B | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|B|ai_daily_usage|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.ai_daily_usage WHERE user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND call_date='2020-01-01' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|B|ai_daily_usage|row=B | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|anon|profiles|row=A
  v_total := v_total + 1;
  IF 'anon' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.profiles WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF 'DENIED' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = 'DENIED' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|anon|profiles|row=A | expected=DENIED | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|profiles|row=A
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.profiles WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|profiles|row=A | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|A|profiles|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.profiles WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '0' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '0' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|A|profiles|row=B | expected=0 | observed=% | %', v_verdict, v_obs, v_detail;
  -- DELETE|B|profiles|row=B
  v_total := v_total + 1;
  IF 'authenticated' = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
  ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); END IF;
  v_denied := false; v_result := null; v_state := null; v_msg := null;
  BEGIN
    EXECUTE $q$WITH x AS (DELETE FROM public.profiles WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' RETURNING 1) SELECT count(*)::int FROM x$q$ INTO v_result;
  EXCEPTION WHEN others THEN
    v_denied := true; v_state := SQLSTATE; v_msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  v_obs := CASE WHEN v_denied THEN 'DENIED' ELSE v_result::text END;
  v_detail := coalesce(v_state,'-') || ' ' || coalesce(v_msg,'-');
  IF '1' = 'DENIED' THEN
     v_verdict := CASE WHEN v_denied THEN 'PASS' ELSE 'FAIL' END;
  ELSE
     v_verdict := CASE WHEN (NOT v_denied) AND v_result::text = '1' THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  IF v_verdict = 'FAIL' THEN v_fails := v_fails + 1; END IF;
  RAISE NOTICE '% | DELETE|B|profiles|row=B | expected=1 | observed=% | %', v_verdict, v_obs, v_detail;
  RAISE NOTICE 'RLS_MATRIX_SUMMARY total=% fails=%', v_total, v_fails;
  IF v_fails > 0 THEN RAISE EXCEPTION 'RLS MATRIX FAILED: % of % cases', v_fails, v_total; END IF;
END $do$;
COMMIT;
