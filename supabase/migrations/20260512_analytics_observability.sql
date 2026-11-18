-- ============================================================
-- Migration: Analytics & Observability Hardening
-- Sprint 1 Day 2 — 2026-05-24
-- ============================================================

-- ──────────────────────────────────────────────
-- Table: ai_call_logs
-- Records every AI call outcome from the reliability wrapper.
-- Used for cost tracking, latency analysis, and provider health.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_call_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature       TEXT NOT NULL,                        -- 'explanation' | 'quiz' | 'roadmap' | 'other'
  provider      TEXT NOT NULL,                        -- 'hosted_claude' | 'hosted_groq' | 'local_ollama' | 'cache' | 'placeholder'
  model         TEXT,                                 -- Specific model ID (e.g. 'claude-3-5-sonnet')
  portal        TEXT,                                 -- 'high_school' | 'university' | 'self_directed'
  success       BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms    INTEGER,
  attempts_used INTEGER,
  estimated_cost_usd NUMERIC(10, 8) DEFAULT 0,
  error_code    TEXT,                                 -- Specific error code (e.g. 'TIMEOUT', 'VALIDATION_FAILED')
  error_message TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for per-user cost & usage queries
CREATE INDEX IF NOT EXISTS ai_call_logs_user_id_idx   ON ai_call_logs(user_id);
CREATE INDEX IF NOT EXISTS ai_call_logs_created_at_idx ON ai_call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_call_logs_feature_idx   ON ai_call_logs(feature);
CREATE INDEX IF NOT EXISTS ai_call_logs_provider_idx  ON ai_call_logs(provider);

-- RLS
ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;

-- INSERT-ONLY for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_call_logs'
      AND policyname = 'Users can insert their own ai_call_logs'
  ) THEN
    CREATE POLICY "Users can insert their own ai_call_logs"
    ON ai_call_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- Ensure NO SELECT policy exists for users (service role only)
DROP POLICY IF EXISTS "Users can read their own ai_call_logs" ON ai_call_logs;

-- ──────────────────────────────────────────────
-- Ensure user_events table exists (idempotent)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name    TEXT NOT NULL,
  learning_mode TEXT DEFAULT 'unknown',
  metadata      JSONB DEFAULT '{}',
  timestamp     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure all expected columns exist (table may predate this migration)
ALTER TABLE user_events
  ADD COLUMN IF NOT EXISTS event_name    TEXT,
  ADD COLUMN IF NOT EXISTS learning_mode TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS metadata      JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS timestamp     TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS user_events_user_id_idx   ON user_events(user_id);
CREATE INDEX IF NOT EXISTS user_events_event_name_idx ON user_events(event_name);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- INSERT-ONLY for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_events'
      AND policyname = 'Users can insert their own events'
  ) THEN
    CREATE POLICY "Users can insert their own events"
    ON user_events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- Ensure NO SELECT policy exists for users
DROP POLICY IF EXISTS "Users can read their own events" ON user_events;
