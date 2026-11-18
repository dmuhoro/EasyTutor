-- 20260606_learning_plans.sql
-- Sprint 4: Learning Plan Engine
-- Stores generated weekly learning plans per user.

create table if not exists learning_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  "generatedAt" timestamp with time zone not null default now(),
  -- Store the full plan as JSONB for flexibility
  "weeklyPlan" jsonb not null default '{}',
  "studyPriorities" jsonb not null default '[]',
  "recoveryPlan" jsonb,
  "reinforcementPlan" jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- One plan per user per generation timestamp
create unique index if not exists idx_learning_plans_user_generated
  on learning_plans (user_id, "generatedAt");

-- Fast lookup latest plan per user
create index if not exists idx_learning_plans_user_latest
  on learning_plans (user_id, "generatedAt" desc);

-- Row level security
alter table learning_plans enable row level security;
create policy "user can CRUD own learning plans"
  on learning_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
