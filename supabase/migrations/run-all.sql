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
CREATE POLICY IF NOT EXISTS "Users can view their own quiz sessions"
  ON quiz_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can create their own quiz sessions"
  ON quiz_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own quiz sessions"
  ON quiz_sessions FOR UPDATE USING (auth.uid() = user_id);

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
CREATE POLICY IF NOT EXISTS "Users can manage their own progress"
  ON user_progress FOR ALL USING (auth.uid() = user_id);

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
CREATE POLICY IF NOT EXISTS "Users can manage their own cached roadmaps"
  ON cached_roadmaps FOR ALL USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 2. Feedback tables (FeedbackModal.tsx — raw client, boundary-
--    validator exempted; never existed before this migration).
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  content_type    TEXT NOT NULL CHECK (content_type IN ('roadmap', 'quiz')),
  rating          TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  feedback_text   TEXT,
  topic           TEXT NOT NULL DEFAULT 'General',
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view their own ai_feedback"
  ON ai_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own ai_feedback"
  ON ai_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  rating      TEXT NOT NULL CHECK (rating IN ('bad', 'okay', 'good', 'positive', 'negative')),
  comment     TEXT,
  source      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view their own user_feedback"
  ON user_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own user_feedback"
  ON user_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

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
CREATE POLICY IF NOT EXISTS "Public read knowledge_chunks"
  ON knowledge_chunks FOR SELECT USING (true);

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
CREATE POLICY IF NOT EXISTS "Users can view their own learning goals"
  ON learning_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can manage their own learning goals"
  ON learning_goals FOR ALL USING (auth.uid() = user_id);

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