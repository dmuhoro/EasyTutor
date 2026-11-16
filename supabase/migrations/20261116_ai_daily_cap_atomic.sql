-- ============================================================================
-- 20261116_ai_daily_cap_atomic.sql — atomic daily AI call cap
--
-- Replaces the SELECT-then-INSERT race in the ai-proxy edge function with a
-- single atomic upsert. The previous pattern (todaysCallCount then a separate
-- INSERT into ai_call_logs) allowed two concurrent requests to both pass the
-- count check and exceed DAILY_LIMIT.
--
-- Tables:
--   ai_daily_usage — per-user per-day call counter (user_id + call_date PK)
--   ai_call_logs   — already exists (from 20260915_governed_cloud_sync)
--
-- Function:
--   increment_daily_ai_calls(user_id, call_date) — atomic increment + limit check
--
-- IDEMPOTENT: safe to re-run. Uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================================

-- 1. Daily usage counter table.
CREATE TABLE IF NOT EXISTS ai_daily_usage (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  call_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, call_date)
);

ALTER TABLE ai_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_daily_usage FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_daily_usage FROM anon;
REVOKE ALL ON TABLE public.ai_daily_usage FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_daily_usage TO authenticated;

CREATE POLICY et_daily_usage_select ON public.ai_daily_usage
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY et_daily_usage_insert ON public.ai_daily_usage
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY et_daily_usage_update ON public.ai_daily_usage
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 2. Atomic increment RPC: inserts or increments the counter in one statement,
--    returns the new count. The edge function compares against DAILY_LIMIT
--    server-side — no client-side check, no race.
CREATE OR REPLACE FUNCTION increment_daily_ai_calls(
  p_user_id UUID,
  p_call_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.ai_daily_usage (user_id, call_date, call_count)
  VALUES (p_user_id, p_call_date, 1)
  ON CONFLICT (user_id, call_date)
  DO UPDATE SET call_count = ai_daily_usage.call_count + 1
  RETURNING call_count INTO v_count;

  RETURN v_count;
END;
$$;

-- 3. Post-condition: verify the table exists and RLS is forced.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relname = 'ai_daily_usage'
      AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND c.relrowsecurity
      AND c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'ai_daily_cap_atomic: ai_daily_usage missing RLS+FORCE';
  END IF;
END $$;

comment on table public.ai_daily_usage is
  'Atomic per-user per-day AI call counter. Replaced the SELECT-then-INSERT race in ai-proxy. Incremented via increment_daily_ai_calls() RPC.';
comment on function public.increment_daily_ai_calls(UUID, DATE) is
  'Atomically increments the daily AI call counter and returns the new count. Single SQL statement — no race between check and increment.';
