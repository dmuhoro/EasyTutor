# ADR-008: Universal Learning Domain and Skill Independence

Status: Accepted (Phase 1, 2026-11-01).

## Context
Curriculum frameworks, skills, outcomes must be separated; skills reusable across curricula; prerequisites as graph; curriculum versioning to protect historical progress.

## Decision
Adopt the domain model in `docs/architecture/UNIVERSAL_LEARNING_DOMAIN.md`. Skills exist independent of curriculum; `OutcomeSkillLink` joins them. Frameworks versioned. Domain types dependency-free (no RN/Supabase/provider).

## Consequences
- Existing portal/subject code remains; domain layer added alongside.
- Future persistence via adapters; migrations only when needed.
- Risk: dual representations (current mastery vs new MasteryState) require adapter mapping; documented, not yet migrated.