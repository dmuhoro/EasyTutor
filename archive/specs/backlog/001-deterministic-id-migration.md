# Spec 001: Deterministic ID Migration

## Goal
Migrate all subjects and topics to use deterministic IDs or ensure existing seeding logic enforces the composite unique constraints defined in ADR 001.

## Design
- **Constraints:** `subjects(name, level)` and `topics(subject_id, title)`.
- **Logic:** Update the seeding system to use `UPSERT` logic exclusively.

## Implementation Boundaries
- **Target:** `supabase/seed_sprint6.sql` (if exists) or all SQL seeding files.
- **Client Side:** Ensure `resolveTopicId` handles the new constrained reality without regressions.

## Dependencies
- Supabase migrations `20260505_unique_constraints.sql`.

## Verification Checklist
- [ ] Run seeding script 3 times; verify no duplicate subjects/topics are created.
- [ ] Verify existing progress data correctly references updated topic UUIDs.
- [ ] Ensure `npx tsc --noEmit` passes.
