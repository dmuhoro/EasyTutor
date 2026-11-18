-- Migration: Progress System Schema Updates
-- Created: 2026-05-05
-- Purpose: Add columns for granular progress tracking and leveling

-- 1. Ensure user_progress base table exists (created idempotently;
--    full definition also in 20260912_product_hardening.sql)
CREATE TABLE IF NOT EXISTS user_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  subject_id      TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  completed_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id),
  attempts        INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  mastery_level   INTEGER DEFAULT 0,
  last_activity   TIMESTAMPTZ DEFAULT now()
);

-- 2. Update user_progress with granular tracking columns
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS attempts         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_answers  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mastery_level    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity    TIMESTAMPTZ DEFAULT now();

-- 2. Update profiles with level column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
