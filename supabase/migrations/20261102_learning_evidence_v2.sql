-- ============================================================================
-- Learning evidence v2 — universal scope, append-only audit trail
-- Additive migration. Safe to run after 20261102_learning_evidence.sql.
--
-- Design notes:
--   * `skill_id` remains the canonical competency. `objective_id` and
--     `curriculum_ref` carry curriculum/self-directed mappings WITHOUT
--     conflating them with the skill (Mission 4 §13).
--   * Evidence is append-only once accepted. Correction is a new record, never
--     an in-place mutation of the audit trail. UPDATE/DELETE privileges and
--     policies are therefore revoked/removed.
-- ============================================================================

alter table public.learning_evidence
  add column if not exists subject_id text,
  add column if not exists objective_id text,
  add column if not exists curriculum_ref text,
  add column if not exists assessment_version integer not null default 1,
  add column if not exists supersedes_id uuid references public.learning_evidence(id) on delete set null;

alter table public.learning_evidence
  drop constraint if exists learning_evidence_provenance_check;

alter table public.learning_evidence
  add constraint learning_evidence_provenance_check
  check (provenance in ('learner_action', 'ai_assisted', 'system_review'));

alter table public.learning_evidence
  drop constraint if exists learning_evidence_item_version_check;
alter table public.learning_evidence
  add constraint learning_evidence_item_version_check check (item_version >= 1);

alter table public.learning_evidence
  drop constraint if exists learning_evidence_assessment_version_check;
alter table public.learning_evidence
  add constraint learning_evidence_assessment_version_check check (assessment_version >= 1);

create index if not exists learning_evidence_user_subject_skill_idx
  on public.learning_evidence (user_id, subject_id, skill_id, created_at desc);

create index if not exists learning_evidence_user_activity_idx
  on public.learning_evidence (user_id, activity_id, created_at desc);

-- Keep updated_at honest even though learners may not update rows.
create or replace function public.touch_learning_evidence_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists learning_evidence_touch_updated_at on public.learning_evidence;
create trigger learning_evidence_touch_updated_at
  before update on public.learning_evidence
  for each row execute function public.touch_learning_evidence_updated_at();

-- ── Append-only enforcement ─────────────────────────────────────────────────
-- Accepted evidence is immutable from the learner's perspective. The v1
-- UPDATE/DELETE policies are removed and the privileges revoked. Only trusted
-- server-side contexts (service role / migrations) may mutate the audit trail.
drop policy if exists "learning_evidence_update_own" on public.learning_evidence;
drop policy if exists "learning_evidence_delete_own" on public.learning_evidence;

revoke update, delete on public.learning_evidence from authenticated;
revoke update, delete on public.learning_evidence from anon;

-- Explicitly keep the learner capabilities that are allowed.
grant select, insert on public.learning_evidence to authenticated;

comment on table public.learning_evidence is
  'Append-only, RLS-protected learner evidence. Owner is always auth.uid(); client_event_id is the idempotency key.';
comment on column public.learning_evidence.skill_id is
  'Canonical competency identifier, shared across curriculum frameworks and self-directed goals.';
comment on column public.learning_evidence.objective_id is
  'Optional learning-objective id. Never treated as the canonical skill.';
comment on column public.learning_evidence.curriculum_ref is
  'Optional curriculum mapping (e.g. KICD/CBC/CBE/university module code).';
