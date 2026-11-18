-- Migration: Quiz Generation Engine
-- Created: 2026-05-06

-- Ensure quiz_sessions base table exists (full definition also in 20260912_product_hardening.sql)
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id   UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL DEFAULT 0,
  total      INTEGER NOT NULL DEFAULT 1,
  date       TIMESTAMPTZ DEFAULT now()
);

-- Add ai_generated flag to quiz_sessions
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;

-- Add granular question tracking to quiz_sessions (optional but recommended for persistence)
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS question_text TEXT,
ADD COLUMN IF NOT EXISTS options TEXT[],
ADD COLUMN IF NOT EXISTS correct_index INTEGER,
ADD COLUMN IF NOT EXISTS explanation TEXT;
