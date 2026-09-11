create table public.adaptive_learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  current_position jsonb not null,
  destination jsonb not null,
  recommended_path jsonb not null,
  recovery_path jsonb,
  acceleration_path jsonb,
  skippable_nodes jsonb,
  prerequisite_gaps jsonb,
  estimated_completion timestamp,
  confidence double precision,
  explanation text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Row level security
alter table public.adaptive_learning_paths enable row level security;
create policy "Allow user own rows"
  on public.adaptive_learning_paths
  for all
  using (auth.uid() = user_id);

-- Indexes
create index adaptive_learning_paths_user_id_idx on public.adaptive_learning_paths(user_id);
create index adaptive_learning_paths_estimated_completion_idx on public.adaptive_learning_paths(estimated_completion);
