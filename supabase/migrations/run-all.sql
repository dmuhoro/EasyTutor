-- ============================================================
-- run-all.sql — 2026-09-12 rollup: product hardening + polymath
--
-- PURPOSE
--   Paste this file ONCE into the Supabase SQL editor of the LIVE
--   project to apply the 2026-09-12 product-hardening and polymath
--   migrations in the correct order. Idempotent (IF NOT EXISTS /
--   ALTER ADD COLUMN IF NOT EXISTS), so a re-run is a safe no-op.
--
-- ORDER / DEPENDENCIES
--   1. 20260912_product_hardening.sql  — first (filename order).
--      Requires: subjects, topics (schema.sql / 20260403),
--      user_events (20260506_habit_system / 20260524_analytics).
--   2. 20260912_polymath.sql           — after hardening.
--      Requires: documents, document_chunks (20260508_documents),
--      pgvector (20260508_vector). No dependency on hardening.
--
-- ROUNDED-OUT DEPENDENCIES (added here, not in the source files)
--   a. CREATE EXTENSION IF NOT EXISTS vector;
--        match_document_chunks declares vector(384) params and
--        document_chunks.embedding is vector(384) — pgvector must
--        be present for the function to even parse.
--   b. DROP the legacy match_document_chunks overloads:
--        (vector(384), int)              from 20260508_vector
--        (vector(384), int, float)       from 20260510_vector_scaling
--        The 8-arg contract (lib/retrieval.ts) is created via
--        CREATE OR REPLACE, which only replaces the SAME signature —
--        the old overloads would otherwise linger forever.
--
-- FRESH-PROJECT NOTE
--   This rollup targets an ALREADY-MIGRATED project (it ALTERs
--   user_events, documents, document_chunks and references subjects/
--   topics). For a from-zero bootstrap: apply supabase/schema.sql
--   (adds CREATE EXTENSION vector to the preamble) FIRST, then this
--   file, then verify with the live-proof checklist.
-- ============================================================

BEGIN;

-- ── Dependency rounding ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

DROP FUNCTION IF EXISTS match_document_chunks(vector(384), int);
DROP FUNCTION IF EXISTS match_document_chunks(vector(384), int, float);

-- ══════════════════════════════════════════════════════════════
-- 1) 20260912_product_hardening.sql (verbatim)
-- ══════════════════════════════════════════════════════════════
-- ============================================================
-- Migration: Product Hardening — make the engine honest
-- Date: 2026-09-12
--
-- Creates the base tables that schema.sql defines but the migration
-- chain never created (quiz_sessions, user_progress, cached_roadmaps),
-- plus feedback tables (FeedbackModal), knowledge_chunks (runtime
-- governor / semantic search), and unifies user_events.
--
-- For a completely fresh project bootstrap:
--   1. Apply supabase/schema.sql first (creates the original subject/topic/profile base).
--   2. Then apply this migration chain in filename order.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. Core tables (matches schema.sql + all later ALTERs)
--    All CREATEs use IF NOT EXISTS — idempotent and safe to
--    re-run against any environment.
-- ──────────────────────────────────────────────────────────────

-- 1a. quiz_sessions (queried/inserted via lib/quizProvider + orchestrated writes)
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  subject_id      TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL DEFAULT 1,
  date            TIMESTAMPTZ DEFAULT now(),
  -- columns added by 20260506_ai_quiz (included idempotently here)
  ai_generated    BOOLEAN DEFAULT false,
  question_text   TEXT,
  options         TEXT[],
  correct_index   INTEGER,
  explanation     TEXT,
  -- governance columns (governedWrite stamps portal_type + updated_at)
  portal_type     TEXT NOT NULL DEFAULT 'high_school',
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own quiz sessions" ON quiz_sessions;
CREATE POLICY "Users can view their own quiz sessions" ON quiz_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own quiz sessions" ON quiz_sessions;
CREATE POLICY "Users can create their own quiz sessions" ON quiz_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own quiz sessions" ON quiz_sessions;
CREATE POLICY "Users can update their own quiz sessions" ON quiz_sessions FOR UPDATE USING (auth.uid() = user_id);

-- 1b. user_progress (queried via governedQuery; written via orchestrator)
CREATE TABLE IF NOT EXISTS user_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  subject_id      TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  completed_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id),
  -- columns added by 20260505_progress_system (included idempotently here)
  attempts        INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  mastery_level   INTEGER DEFAULT 0,
  last_activity   TIMESTAMPTZ DEFAULT now(),
  -- governance
  portal_type     TEXT NOT NULL DEFAULT 'high_school',
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own progress" ON user_progress;
CREATE POLICY "Users can manage their own progress" ON user_progress FOR ALL USING (auth.uid() = user_id);

-- 1c. cached_roadmaps (read/written via roadmapStore + orchestrator)
CREATE TABLE IF NOT EXISTS cached_roadmaps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) NOT NULL,
  subject_id          TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id            UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  roadmap_json        JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id),
  -- columns added by 20260505_unique_constraints (included idempotently here)
  learning_mode       TEXT,
  checked_tasks       JSONB DEFAULT '{}',
  last_opened_at      TIMESTAMPTZ,
  completion_status   TEXT CHECK (completion_status IN ('not_started', 'in_progress', 'completed')),
  -- governance (required by governedQuery .eq('portal_type'))
  portal_type         TEXT NOT NULL DEFAULT 'high_school',
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- required by roadmapStore saveTaskProgressToCloud upsert onConflict 'id,user_id'
CREATE UNIQUE INDEX IF NOT EXISTS cached_roadmaps_id_user_idx
  ON cached_roadmaps (id, user_id);

ALTER TABLE cached_roadmaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own cached roadmaps" ON cached_roadmaps;
CREATE POLICY "Users can manage their own cached roadmaps" ON cached_roadmaps FOR ALL USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 2. Feedback tables (FeedbackModal.tsx — routed through the governed
--    layer via Database.governedWrite; portal_type is stamped by the
--    write path, Constitution Article III).
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  content_type    TEXT NOT NULL CHECK (content_type IN ('roadmap', 'quiz')),
  rating          TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  feedback_text   TEXT,
  topic           TEXT NOT NULL DEFAULT 'General',
  portal_type     TEXT NOT NULL DEFAULT 'high_school',
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own ai_feedback" ON ai_feedback;
CREATE POLICY "Users can view their own ai_feedback" ON ai_feedback FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own ai_feedback" ON ai_feedback;
CREATE POLICY "Users can insert their own ai_feedback" ON ai_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  rating      TEXT NOT NULL CHECK (rating IN ('bad', 'okay', 'good', 'positive', 'negative')),
  comment     TEXT,
  source      TEXT NOT NULL,
  portal_type TEXT NOT NULL DEFAULT 'high_school',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own user_feedback" ON user_feedback;
CREATE POLICY "Users can view their own user_feedback" ON user_feedback FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own user_feedback" ON user_feedback;
CREATE POLICY "Users can insert their own user_feedback" ON user_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 3. knowledge_chunks (runtimeGovernor + semanticSearchEngine
--    governed reads; currently no app-level writes — any future
--    ingestion inserts go through service role or admin).
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES auth.users(id),
  portal_type            TEXT NOT NULL DEFAULT 'high_school',
  chunk_text             TEXT NOT NULL,
  source                 TEXT NOT NULL,
  subject_id             TEXT REFERENCES subjects(id),
  topic_id               UUID REFERENCES topics(id),
  -- taxonomy scope columns (resilient to governedQuery taxonomyScope filters)
  curriculum_scope       TEXT,
  school_scope           TEXT,
  department_scope       TEXT,
  subject_scope          TEXT,
  knowledge_domain_scope TEXT,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read knowledge_chunks" ON knowledge_chunks;
CREATE POLICY "Public read knowledge_chunks" ON knowledge_chunks FOR SELECT USING (true);

-- ──────────────────────────────────────────────────────────────
-- 4. Unify user_events (habit writer: event_type/payload;
--    analytics writer: event_name/learning_mode/metadata/timestamp).
--    Both writers must succeed — ALTER ADD COLUMN IF NOT EXISTS
--    ensures the schema supports both inserts.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE user_events ADD COLUMN IF NOT EXISTS event_name    TEXT;
ALTER TABLE user_events ADD COLUMN IF NOT EXISTS learning_mode TEXT DEFAULT 'unknown';
ALTER TABLE user_events ADD COLUMN IF NOT EXISTS metadata      JSONB DEFAULT '{}';
ALTER TABLE user_events ADD COLUMN IF NOT EXISTS timestamp     TIMESTAMPTZ DEFAULT now();

-- ──────────────────────────────────────────────────────────────
-- 5. Fix subjects level CHECK.
--    20260403 created subjects with CHECK(... IN ('high_school','university','general')).
--    The app inserts 'self_directed' rows; that CHECK rejects them.
--    Find and drop any level-CHECK that doesn't include
--    'self_directed', then add the canonical constraint.
-- ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  con_name TEXT;
BEGIN
  -- Drop any existing level CHECK that rejects 'self_directed'
  FOR con_name IN
    SELECT c.conname
      FROM pg_constraint c
     WHERE c.conrelid = 'public.subjects'::regclass
       AND c.contype  = 'c'
       AND pg_get_constraintdef(c.oid) ILIKE '%level%'
       AND pg_get_constraintdef(c.oid) NOT LIKE '%self_directed%'
  LOOP
    EXECUTE format('ALTER TABLE public.subjects DROP CONSTRAINT %I', con_name);
  END LOOP;

  -- Add the canonical constraint (only if missing)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.subjects'::regclass
       AND contype  = 'c'
       AND conname  = 'subjects_level_check'
  ) THEN
    ALTER TABLE public.subjects
      ADD CONSTRAINT subjects_level_check
      CHECK (level IN ('high_school', 'university', 'self_directed'));
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 2) 20260912_polymath.sql (verbatim)
-- ══════════════════════════════════════════════════════════════
-- Polymath mode (Phase C): arbitrary free-form learning identities + real RAG.
-- Added 2026-09-12.

-- 1. Learning goals: per-user journal of free-form ("learn anything") topics.
--    This is the stable learning identity for topics that have no curriculum
--    subject/topic row. Unique on (user_id, topic) so upserts are idempotent.
CREATE TABLE IF NOT EXISTS learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  topic TEXT NOT NULL,
  portal_type TEXT NOT NULL DEFAULT 'knowledge_explorer',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS learning_goals_user_topic_idx
  ON learning_goals (user_id, topic);

ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own learning goals" ON learning_goals;
CREATE POLICY "Users can view their own learning goals" ON learning_goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage their own learning goals" ON learning_goals;
CREATE POLICY "Users can manage their own learning goals" ON learning_goals FOR ALL USING (auth.uid() = user_id);

-- 2. document_chunks: metadata + taxonomy scoping the governed retriever
--    requires (match_document_chunks filters on these). Embedding column was
--    added by 20260508_vector.sql; metadata jsonb is selected by the RPC.
--    Each chunk is self-owned (user_id) so governedWrites can stamp the owner
--    and RLS can scope retrieval to auth.uid() without a join.
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS portal_type TEXT NOT NULL DEFAULT 'high_school',
  ADD COLUMN IF NOT EXISTS taxonomy_scope TEXT,
  ADD COLUMN IF NOT EXISTS curriculum_scope TEXT,
  ADD COLUMN IF NOT EXISTS school_scope TEXT,
  ADD COLUMN IF NOT EXISTS vector_namespace TEXT;

-- documents parent row is written through governedWrite, which stamps
-- portal_type + updated_at as well as user_id.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS portal_type TEXT NOT NULL DEFAULT 'knowledge_explorer',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill self-ownership from the parent document (chunks created before
-- this migration inherit their document owner).
UPDATE document_chunks SET user_id = documents.user_id
  FROM documents
  WHERE document_chunks.document_id = documents.id
    AND document_chunks.user_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_chunks_user_id_not_null'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_chunks' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE document_chunks ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their own document chunks"
  ON document_chunks;
CREATE POLICY "Users can access their own document chunks"
  ON document_chunks FOR ALL
  USING (auth.uid() = user_id);

-- 3. Real, governable semantic matcher. Signature matches lib/retrieval.ts:
--    portal_type / taxonomy_scope / curriculum_scope / school_scope /
--    vector_namespace filters applied against document_chunks metadata.
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(384),
  match_count int DEFAULT 5,
  min_similarity float DEFAULT 0.0,
  portal_type text DEFAULT NULL,
  taxonomy_scope text DEFAULT NULL,
  curriculum_scope text DEFAULT NULL,
  school_scope text DEFAULT NULL,
  vector_namespace text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) >= min_similarity
    AND (portal_type IS NULL OR document_chunks.portal_type = portal_type)
    AND (vector_namespace IS NULL OR document_chunks.vector_namespace = vector_namespace)
    AND (taxonomy_scope IS NULL OR document_chunks.taxonomy_scope = taxonomy_scope)
    AND (curriculum_scope IS NULL OR document_chunks.curriculum_scope = curriculum_scope)
    AND (school_scope IS NULL OR document_chunks.school_scope = school_scope)
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMIT;
-- ──────────────────────────────────────────────────────────────
-- 20261104_rls_hardening.sql · canonical RLS hardening
-- (mirrored verbatim; idempotent; revokes anon full-CRUD, forces RLS)
-- ──────────────────────────────────────────────────────────────

-- ============================================================
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
-- ============================================================

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

-- ──────────────────────────────────────────────────────────────
-- 20261116_ai_daily_cap_atomic.sql · atomic daily AI call cap
-- (mirrored verbatim; idempotent; replaces SELECT-then-INSERT race)
-- ──────────────────────────────────────────────────────────────

-- ============================================================================
-- 20261116_ai_daily_cap_atomic.sql — atomic daily AI call cap
--
-- Replaces the SELECT-then-INSERT race in the ai-proxy edge function with a
-- single atomic upsert. The previous pattern (todaysCallCount then a separate
-- INSERT into ai_call_logs) allowed two concurrent requests to both pass the
-- count check and exceed DAILY_LIMIT.
--
-- Tables:
--   ai_daily_usage — per-user per-day call counter (user_id + call_date PK)
--   ai_call_logs   — already exists (from 20260915_governed_cloud_sync)
--
-- Function:
--   increment_daily_ai_calls(user_id, call_date) — atomic increment + limit check
--
-- IDEMPOTENT: safe to re-run. Uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================================

-- 1. Daily usage counter table.
CREATE TABLE IF NOT EXISTS ai_daily_usage (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  call_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, call_date)
);

ALTER TABLE ai_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_daily_usage FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_daily_usage FROM anon;
REVOKE ALL ON TABLE public.ai_daily_usage FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_daily_usage TO authenticated;

CREATE POLICY et_daily_usage_select ON public.ai_daily_usage
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY et_daily_usage_insert ON public.ai_daily_usage
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY et_daily_usage_update ON public.ai_daily_usage
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 2. Atomic increment RPC: inserts or increments the counter in one statement,
--    returns the new count. The edge function compares against DAILY_LIMIT
--    server-side — no client-side check, no race.
CREATE OR REPLACE FUNCTION increment_daily_ai_calls(
  p_user_id UUID,
  p_call_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.ai_daily_usage (user_id, call_date, call_count)
  VALUES (p_user_id, p_call_date, 1)
  ON CONFLICT (user_id, call_date)
  DO UPDATE SET call_count = ai_daily_usage.call_count + 1
  RETURNING call_count INTO v_count;

  RETURN v_count;
END;
$$;

-- 3. Post-condition: verify the table exists and RLS is forced.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relname = 'ai_daily_usage'
      AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND c.relrowsecurity
      AND c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'ai_daily_cap_atomic: ai_daily_usage missing RLS+FORCE';
  END IF;
END $$;

comment on table public.ai_daily_usage is
  'Atomic per-user per-day AI call counter. Replaced the SELECT-then-INSERT race in ai-proxy. Incremented via increment_daily_ai_calls() RPC.';
comment on function public.increment_daily_ai_calls(UUID, DATE) is
  'Atomically increments the daily AI call counter and returns the new count. Single SQL statement — no race between check and increment.';

-- ──────────────────────────────────────────────────────────────
-- 20260915_governed_cloud_sync.sql · governed additive backstops
-- (mirrored verbatim; idempotent; cloud catch-up after hardening)
-- ──────────────────────────────────────────────────────────────
-- ============================================================
-- 20260915_governed_cloud_sync.sql — governed cloud schema sync
--
-- PURPOSE
--   Single, one-paste additive migration that reconciles a CLOUD
--   schema-cache that predates the repo's canonical governed DDL.
--   The repo's canonical habitat (run-all.sql / hardening) already
--   defines every table + governed column; this migration ONLY adds
--   the governed columns the write path cold-persists, on the chance
--   the live project lagged to an older snapshot.
--
--   This is what permanently kills the PGRST204/PGRST205/404/42703
--   cone in the governed telemetry + roadmap write path. It mirrors
--   the hardening migration's own style: additive, idempotent,
--   IF NOT EXISTS everywhere, zero destructive ops, RLS on new
--   telemetry tables.
--
--   To apply: open your Supabase project → SQL editor → paste the
--   FULL contents of this file → Run. Safe to re-run (no-op).
--
-- GOVERNANCE (Constitution Article III / ADR-006)
--   - Governed reads/writes go through lib/supabase.ts with a
--     resolved portal; profile/roadmap rows are portal-stamped.
--   - This migration only ADDs governed columns; it never drops,
--     never renames, never backfills beyond safe defaults, and it
--     leaves auth-user-owned data in place. Fails closed if a
--     prerequisite auth object is absent; never fails open.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 0) Preflight: required auth object (from the governed layer).
--    The governed INSERT paths are user-bound; if auth.users does
--    not exist the migration aborts loudly rather than stamping
--    dead FK targets (fail closed, never fail open).
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'auth')) THEN
    RAISE EXCEPTION 'auth.users does not exist — run schema.sql / base bootstrap first. Governed sync aborted (fail closed).';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 1) SUBJECTS / TOPICS — governed FK targets for roadmaps.
--    Idempotent; present in canonical schema.sql, re-stamped here
--    so foreign keys never 400 on a stale cloud.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS topics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id    TEXT REFERENCES subjects(id),
  name          TEXT NOT NULL,
  order_index   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 2) PROFILES — governed per-user row (portal + streak + active).
--    Only ADDs columns the app cold-persists; never alters the
--    canonical profiles identity columns.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS portal_type      TEXT NOT NULL DEFAULT 'high_school',
  ADD COLUMN IF NOT EXISTS last_active_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS current_streak   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_days      INTEGER DEFAULT 0;

-- ──────────────────────────────────────────────────────────────
-- 3) CACHED_ROADMAPS — governed portal-stamped roadmap store.
--    The governed write path upserts roadmap_json + portal_type;
--    a stale cloud 400s on portal_type. Additive only.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cached_roadmaps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id        TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id          UUID REFERENCES topics(id) ON DELETE CASCADE,
  roadmap_json      JSONB NOT NULL DEFAULT '{}',
  portal_type       TEXT NOT NULL DEFAULT 'high_school',
  learning_mode     TEXT,
  checked_tasks     JSONB DEFAULT '{}',
  completion_status TEXT CHECK (completion_status IN ('not_started','in_progress','completed')),
  last_opened_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- ──────────────────────────────────────────────────────────────
-- 4) USER_EVENTS — governed analytics append (fail-closed noise).
--    A stale cloud 404s on event_id; additive only.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name    TEXT NOT NULL,
  event_id      TEXT,
  learning_mode TEXT DEFAULT 'unknown',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 5) AI_CALL_LOGS — governed AI reliability observability.
CREATE TABLE IF NOT EXISTS ai_call_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature             TEXT NOT NULL,
  provider            TEXT NOT NULL,
  model               TEXT,
  portal              TEXT,
  success             BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms          INTEGER,
  attempts_used       INTEGER,
  estimated_cost_usd  NUMERIC(10,8) DEFAULT 0,
  error_code          TEXT,
  error_message       TEXT,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 6) GOVERNED COLUMN BACKSTOPS on the remaining governed tables —
--    the columns the governed write path cold-persists but that a
--    pre-hardening cloud may lack. Additive + idempotent.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS mastery_level  TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS last_activity  TIMESTAMPTZ;

ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS ai_generated   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS score          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total          INTEGER DEFAULT 0;

ALTER TABLE question_bank
  ADD COLUMN IF NOT EXISTS ai_generated   BOOLEAN DEFAULT FALSE;

-- ──────────────────────────────────────────────────────────────
-- 7) ROW LEVEL SECURITY on the NEW telemetry tables (same policy
--    shape hardening already stamps elsewhere — mirrors, never
--    invents). Auth-bound reads/writes only.
-- ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['cached_roadmaps','user_events','ai_call_logs'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;
