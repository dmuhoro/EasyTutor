-- ADR-009 / W1-2d: forward-only data migration.
--
-- Before ADR-009 the governed import path stamped user-uploaded chunks with
-- `curriculum_scope = 'GLOBAL_OPEN'`, which could expose a learner's private
-- notes under a shared scope. W1-2c fixes the write path so new imports are
-- always `USER_PRIVATE`. This migration relabels the rows already written by
-- the old path so existing user content is private too.
--
-- Scope is deliberately narrow: only rows that are user-owned (user_id IS NOT
-- NULL) AND currently labelled GLOBAL_OPEN. Reference/curriculum chunks with
-- no owner are untouched, and every other scope is left as-is. Idempotent:
-- a re-run finds zero matching rows.
UPDATE public.document_chunks
SET curriculum_scope = 'USER_PRIVATE'
WHERE user_id IS NOT NULL
  AND curriculum_scope = 'GLOBAL_OPEN';
