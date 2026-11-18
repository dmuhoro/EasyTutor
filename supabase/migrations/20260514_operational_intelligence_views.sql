-- ============================================================
-- Migration: Operational Intelligence Views (Sprint 1 Day 3)
-- Date: 2026-05-27
-- ============================================================

-- Queryable AI operations metrics (latency, cost, success rate) by day/provider/portal.
CREATE OR REPLACE VIEW ai_operational_daily AS
SELECT
  date_trunc('day', created_at) AS day,
  provider,
  COALESCE(portal, 'unknown') AS portal,
  feature,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE success) AS successful_calls,
  COUNT(*) FILTER (WHERE NOT success) AS failed_calls,
  ROUND(AVG(latency_ms)::numeric, 2) AS avg_latency_ms,
  ROUND(COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::numeric, 2) AS p95_latency_ms,
  ROUND(SUM(COALESCE(estimated_cost_usd, 0))::numeric, 6) AS total_estimated_cost_usd
FROM ai_call_logs
GROUP BY 1, 2, 3, 4;

-- Basic retention-ready infrastructure from user events.
-- Emits first-seen day plus active-day and day_offset for D1/D7 style reporting.
CREATE OR REPLACE VIEW retention_event_offsets AS
WITH first_seen AS (
  SELECT
    user_id,
    MIN(date_trunc('day', timestamp)) AS cohort_day
  FROM user_events
  GROUP BY user_id
),
active_days AS (
  SELECT DISTINCT
    user_id,
    date_trunc('day', timestamp) AS active_day
  FROM user_events
)
SELECT
  f.user_id,
  f.cohort_day,
  a.active_day,
  (a.active_day::date - f.cohort_day::date) AS day_offset
FROM first_seen f
JOIN active_days a ON a.user_id = f.user_id;

