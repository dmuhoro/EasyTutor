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
