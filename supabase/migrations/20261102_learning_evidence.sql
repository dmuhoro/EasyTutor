-- Additive: canonical learning evidence for the Mathematics reference journey.
create table if not exists public.learning_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_event_id text not null,
  skill_id text not null,
  activity_id text not null,
  item_id text,
  item_version integer not null default 1,
  dimension text not null check (dimension in ('recall','understanding','application','analysis','reasoning','evaluation','creation','transfer','retention')),
  response text,
  score numeric(5,4) not null check (score >= 0 and score <= 1),
  independent boolean not null default false,
  hints integer not null default 0 check (hints >= 0),
  provenance text not null default 'learner_action',
  validation_status text not null default 'validated' check (validation_status in ('validated','provisional','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_event_id)
);
create index if not exists learning_evidence_user_skill_idx on public.learning_evidence (user_id, skill_id, created_at desc);

alter table public.learning_evidence enable row level security;

drop policy if exists "learning_evidence_select_own" on public.learning_evidence;
create policy "learning_evidence_select_own" on public.learning_evidence
  for select using (auth.uid() = user_id);

drop policy if exists "learning_evidence_insert_own" on public.learning_evidence;
create policy "learning_evidence_insert_own" on public.learning_evidence
  for insert with check (auth.uid() = user_id);

drop policy if exists "learning_evidence_update_own" on public.learning_evidence;
create policy "learning_evidence_update_own" on public.learning_evidence
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "learning_evidence_delete_own" on public.learning_evidence;
create policy "learning_evidence_delete_own" on public.learning_evidence
  for delete using (auth.uid() = user_id);
