-- 20260606_learning_interventions.sql
-- Sprint 4: Intervention Intelligence Engine
-- Stores ranked intervention recommendations per user per topic.

create table if not exists learning_interventions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  "topicId" text not null,
  "subjectId" text not null,
  type text not null check (type in (
    'review_topic',
    'active_recall',
    'spaced_repetition',
    'teach_back',
    'confidence_rebuild',
    'practice_questions',
    'mixed_topic_reinforcement',
    'targeted_remediation'
  )),
  "priorityScore" numeric not null default 0 check ("priorityScore" >= 0 and "priorityScore" <= 100),
  plan text not null default '',
  "expectedOutcome" text not null default '',
  "estimatedImprovement" numeric not null default 0,
  rationale text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Unique per user + topic (one active intervention per topic)
create unique index if not exists idx_interventions_user_topic
  on learning_interventions (user_id, "topicId");

-- Fast lookup by user and priority
create index if not exists idx_interventions_user_priority
  on learning_interventions (user_id, "priorityScore" desc);

-- Row level security
alter table learning_interventions enable row level security;
create policy "user can CRUD own interventions"
  on learning_interventions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
