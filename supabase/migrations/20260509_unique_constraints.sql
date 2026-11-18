-- Migration: Unique constraints for deterministic seeding
-- Created: 2026-05-05
-- Purpose: Prevent duplicate subjects and topics, enabling idempotent upserts

-- 1. Add UNIQUE constraint on subjects(name, level)
--    This prevents the same subject being inserted twice for the same portal.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_name_level_unique') THEN
        ALTER TABLE subjects ADD CONSTRAINT subjects_name_level_unique UNIQUE (name, level);
    END IF;
END $$;

-- 2. Add UNIQUE constraint on topics(subject_id, title)
--    This enables ON CONFLICT upsert and prevents phantom duplicates.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topics_subject_title_unique') THEN
        ALTER TABLE topics ADD CONSTRAINT topics_subject_title_unique UNIQUE (subject_id, title);
    END IF;
END $$;

-- 3. Fix subjects.level CHECK to match schema.sql (remove legacy 'general')
--    The migration 20260403_portal_schema.sql used 'general' which is now invalid.
ALTER TABLE subjects
  DROP CONSTRAINT IF EXISTS subjects_level_check;

ALTER TABLE subjects
  ADD CONSTRAINT subjects_level_check
  CHECK (level IN ('high_school', 'university', 'self_directed'));

-- 4. Add missing columns to cached_roadmaps that roadmapStore writes to
CREATE TABLE IF NOT EXISTS cached_roadmaps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) NOT NULL,
  subject_id          TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id            UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  roadmap_json        JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id),
  learning_mode       TEXT,
  checked_tasks       JSONB DEFAULT '{}',
  last_opened_at      TIMESTAMPTZ,
  completion_status   TEXT CHECK (completion_status IN ('not_started', 'in_progress', 'completed')),
  portal_type         TEXT NOT NULL DEFAULT 'high_school',
  updated_at          TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cached_roadmaps
  ADD COLUMN IF NOT EXISTS learning_mode   TEXT,
  ADD COLUMN IF NOT EXISTS checked_tasks   JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_opened_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_status TEXT
    CHECK (completion_status IN ('not_started', 'in_progress', 'completed'));

-- 5. Add missing columns to profiles that were in schema.sql but not the migration
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp_total          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_active_date  DATE    DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS streak_freezes    INTEGER DEFAULT 1;
