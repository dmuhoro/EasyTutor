-- ============================================================
-- 20261114_feedback_governed_write.sql — feedback tables governed
--
-- PURPOSE
--   FeedbackModal.tsx previously wrote ai_feedback / user_feedback
--   through a raw Supabase client (getSupabaseClient), bypassing the
--   governed layer (Constitution Article III). This migration adds the
--   portal_type column so feedback writes can route through
--   Database.governedWrite and be stamped with the same portal +
--   user_id ownership every other governed write carries.
--
--   Additive and idempotent: IF NOT EXISTS everywhere, no destructive
--   ops, RLS preserved. Safe to re-run (no-op).
-- ============================================================

ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS portal_type TEXT;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS portal_type TEXT;

-- Backfill existing rows with the conservative learner portal so the
-- column is never NULL on legacy data.
UPDATE ai_feedback    SET portal_type = 'high_school' WHERE portal_type IS NULL;
UPDATE user_feedback SET portal_type = 'high_school' WHERE portal_type IS NULL;

ALTER TABLE ai_feedback ALTER COLUMN portal_type SET NOT NULL;
ALTER TABLE user_feedback ALTER COLUMN portal_type SET NOT NULL;