-- 20260701_learning_retention_profiles.sql
-- Migration: learning_retention_profiles
-- Stores spaced repetition retention profiles per user.

create table if not exists learning_retention_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  subject_id text not null,
  topic_id text not null,
  subtopic_id text,
  level text not null check (level in ('subject','topic','subtopic')),
  last_reviewed_at timestamp with time zone not null default now(),
  review_count integer not null default 0,
  retention_score numeric not null default 100,
  forgetting_risk numeric not null default 0,
  next_review_date timestamp with time zone not null default now(),
  review_stage integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indexes for fast lookup
create index if not exists idx_retention_user_subject_topic on learning_retention_profiles (user_id, subject_id, topic_id);
create index if not exists idx_retention_next_review on learning_retention_profiles (next_review_date);

-- Row level security: users can only access their own rows
alter table learning_retention_profiles enable row level security;
create policy "user can CRUD own retention profiles"
  on learning_retention_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Constraints
alter table learning_retention_profiles add constraint chk_review_stage_range check (review_stage >= 1 and review_stage <= 7);
