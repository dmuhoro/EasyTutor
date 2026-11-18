-- 20260606_learning_risk_predictions.sql
-- Sprint 4: Weakness Prediction Engine
-- Stores per-topic risk predictions for each user.

create table if not exists learning_risk_predictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  "topicId" text not null,
  "subjectId" text not null,
  "riskScore" numeric not null default 0 check ("riskScore" >= 0 and "riskScore" <= 100),
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 100),
  reason text not null default '',
  intervention text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Unique per user + topic
create unique index if not exists idx_risk_predictions_user_topic
  on learning_risk_predictions (user_id, "topicId");

-- Fast lookup by user and severity
create index if not exists idx_risk_predictions_user_severity
  on learning_risk_predictions (user_id, severity);

-- Row level security
alter table learning_risk_predictions enable row level security;
create policy "user can CRUD own risk predictions"
  on learning_risk_predictions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
