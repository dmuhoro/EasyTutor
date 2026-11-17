-- W1-3 two-user RPC privacy harness (Wave 1 truth pass).
-- Same prerequisites as wave1_rls_matrix.sql. Never run on a real project.
-- Run: docker exec <container> psql -U postgres -d postgres -f <this file>
-- Expected: RPC_PRIVACY_SUMMARY total=9 fails=0.

-- W1-3 §5: two-user privacy through RPCs in the coherent local DB.
\set ON_ERROR_STOP on
BEGIN;

DELETE FROM document_chunks;
DELETE FROM documents;
DELETE FROM user_progress;
DELETE FROM quiz_sessions;
DELETE FROM ai_daily_usage;
DELETE FROM learning_goals;
DELETE FROM profiles;
DELETE FROM auth.users WHERE id IN ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
INSERT INTO auth.users(id) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
INSERT INTO documents(id,user_id,title) VALUES
  ('d1111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A doc'),
  ('d2222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B doc');

-- 384-dim constant vector, valid for every row (so min_similarity=0 admits all owned rows).
INSERT INTO document_chunks(id,document_id,user_id,content,metadata,portal_type,curriculum_scope,embedding)
VALUES
  ('11111111-1111-4111-8111-111111111111','d1111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'photosynthesis converts light into chemical energy', '{"src":"A-private"}'::jsonb,
   'knowledge_explorer','USER_PRIVATE', array_fill(0.5::float8,ARRAY[384])::vector),
  ('22222222-2222-4222-8222-222222222222','d2222222-2222-4222-8222-222222222222',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'photosynthesis converts light into chemical energy', '{"src":"B-private"}'::jsonb,
   'knowledge_explorer','USER_PRIVATE', array_fill(0.5::float8,ARRAY[384])::vector),
  ('33333333-3333-4333-8333-333333333333','d1111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'cellular respiration releases energy from glucose', '{"src":"A-shared"}'::jsonb,
   'knowledge_explorer','GLOBAL_OPEN', array_fill(0.5::float8,ARRAY[384])::vector);

DO $do$
DECLARE
  c record; n int; denied bool; st text; msg text; obs text; verdict text; fails int := 0; total int := 0;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('FTS|A|photosynthesis',              'authenticated','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        $q$SELECT count(*)::int FROM search_document_chunks_fts('photosynthesis','knowledge_explorer',NULL,NULL,NULL,10)$q$, '1'::text),
      ('FTS|B|photosynthesis',              'authenticated','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        $q$SELECT count(*)::int FROM search_document_chunks_fts('photosynthesis','knowledge_explorer',NULL,NULL,NULL,10)$q$, '1'::text),
      ('FTS|A|mismatched curriculum keeps USER_PRIVATE', 'authenticated','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        $q$SELECT count(*)::int FROM search_document_chunks_fts('photosynthesis','knowledge_explorer',NULL,'KICD_KCSE',NULL,10)$q$, '1'::text),
      ('FTS|A|no-claim caller',             'authenticated','',
        $q$SELECT count(*)::int FROM search_document_chunks_fts('photosynthesis','knowledge_explorer',NULL,NULL,NULL,10)$q$, '0'::text),
      ('FTS|anon-role',                     'anon','',
        $q$SELECT count(*)::int FROM search_document_chunks_fts('photosynthesis','knowledge_explorer',NULL,NULL,NULL,10)$q$, 'DENIED'),
      ('VECTOR|A|all owned',                'authenticated','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        $q$SELECT count(*)::int FROM match_document_chunks(array_fill(0.5::float8,ARRAY[384])::vector,10,0.0,'knowledge_explorer',NULL,NULL,NULL,NULL)$q$, '2'::text),
      ('VECTOR|B|all owned',                'authenticated','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        $q$SELECT count(*)::int FROM match_document_chunks(array_fill(0.5::float8,ARRAY[384])::vector,10,0.0,'knowledge_explorer',NULL,NULL,NULL,NULL)$q$, '1'::text),
      ('VECTOR|A|no-claim caller',          'authenticated','',
        $q$SELECT count(*)::int FROM match_document_chunks(array_fill(0.5::float8,ARRAY[384])::vector,10,0.0,'knowledge_explorer',NULL,NULL,NULL,NULL)$q$, '0'::text),
      ('VECTOR|anon-role',                  'anon','',
        $q$SELECT count(*)::int FROM match_document_chunks(array_fill(0.5::float8,ARRAY[384])::vector,10,0.0,'knowledge_explorer',NULL,NULL,NULL,NULL)$q$, 'DENIED')
    ) AS v(label, role, claim, stmt, expected)
  LOOP
    total := total + 1;
    IF c.role = 'anon' THEN EXECUTE 'SET LOCAL ROLE anon'; PERFORM set_config('request.jwt.claim.sub','',true);
    ELSE EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM set_config('request.jwt.claim.sub',c.claim,true); END IF;
    denied := false; n := null; st := null; msg := null;
    BEGIN
      EXECUTE c.stmt INTO n;
    EXCEPTION WHEN others THEN
      denied := true; st := SQLSTATE; msg := SQLERRM;
    END;
    EXECUTE 'RESET ROLE';
    obs := CASE WHEN denied THEN 'DENIED' ELSE n::text END;
    IF c.expected::text = 'DENIED' THEN
      verdict := CASE WHEN denied THEN 'PASS' ELSE 'FAIL' END;
    ELSE
      verdict := CASE WHEN (NOT denied) AND n::text = c.expected::text THEN 'PASS' ELSE 'FAIL' END;
    END IF;
    IF verdict = 'FAIL' THEN fails := fails + 1; END IF;
    RAISE NOTICE '% | % | expected=% observed=% | % %', verdict, c.label, c.expected, obs, coalesce(st,'-'), coalesce(msg,'-');
  END LOOP;
  RAISE NOTICE 'RPC_PRIVACY_SUMMARY total=% fails=%', total, fails;
  IF fails > 0 THEN RAISE EXCEPTION 'RPC PRIVACY FAILED: % of %', fails, total; END IF;
END $do$;

COMMIT;
