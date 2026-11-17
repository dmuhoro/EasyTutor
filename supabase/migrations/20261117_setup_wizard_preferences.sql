-- Migration: 20261117_setup_wizard_preferences
-- Purpose: make `profiles` match the columns the wired setup wizard writes.
--
-- Defect this fixes (observed in the W1-5 demo, 2026-11-17):
--   app/setup-wizard/index.tsx -> Database.governedWrite('profiles', {...})
--   writes country, curriculum_track, learning_goal, exam_date, daily_minutes,
--   language and data_mode. The original profiles table only had
--   id/email/learning_mode/onboarding_complete, so PostgREST returned
--   "Could not find the 'country' column of 'profiles' in the schema cache",
--   the governed write threw, and the wizard silently fell back to "Setup
--   saved locally" — the profile row was never persisted (a silent drop).
--
-- Idempotent: safe to apply repeatedly and safe alongside the historical
-- migrations; it only adds columns, never alters or drops existing ones.
-- `profiles` stays RLS-protected, one private row per auth user (USER_PRIVATE).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS curriculum_track TEXT,
  ADD COLUMN IF NOT EXISTS learning_goal TEXT,
  ADD COLUMN IF NOT EXISTS exam_date DATE,
  ADD COLUMN IF NOT EXISTS daily_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS data_mode TEXT CHECK (data_mode IN ('standard', 'low'));
