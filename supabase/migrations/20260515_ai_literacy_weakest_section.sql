-- ============================================================
-- Migration: AI Literacy Weakest Section Tracking
-- Date: 2026-05-30
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_literacy_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_number INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  portal_type TEXT NOT NULL DEFAULT 'ai_literacy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_unit INTEGER,
  last_section INTEGER,
  last_opened_at TIMESTAMPTZ,
  UNIQUE(user_id, unit_number)
);

ALTER TABLE ai_literacy_progress
ADD COLUMN IF NOT EXISTS weakest_section TEXT;

ALTER TABLE ai_literacy_progress
ADD COLUMN IF NOT EXISTS weakest_score INTEGER;
