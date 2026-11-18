CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_active_date DATE,
ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;

ALTER TABLE user_events
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
