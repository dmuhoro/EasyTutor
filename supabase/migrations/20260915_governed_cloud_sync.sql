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
