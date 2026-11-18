-- ============================================================
-- Migration: Analytics Integrity Hardening (Sprint 1 Day 3)
-- Date: 2026-05-27
-- ============================================================

-- Ensure analytics events can be replayed idempotently from offline queue.
-- We store a deterministic client event_id and enforce uniqueness per user.

ALTER TABLE user_events
ADD COLUMN IF NOT EXISTS event_id UUID;

-- Unique per-user event id for duplicate-safe replay.
CREATE UNIQUE INDEX IF NOT EXISTS user_events_user_id_event_id_uidx
ON user_events(user_id, event_id)
WHERE event_id IS NOT NULL;

