# Universal Learning Domain

## Entities
- **Discipline** (id, name, description) — broad area.
- **CurriculumFramework** (id, code, name, version, publisher, effectiveFrom, region) — e.g. "CBC v2017", "8-4-4", "BSc CS 2024".
- **Subject/Area** hierarchical within a framework.
- **Strand / SubStrand / LearningOutcome** (outcome text, level, bloom-ish).
- **Skill** (id, slug, name, description) — EXISTS INDEPENDENT of curriculum. Reusable.
- **OutcomeSkillLink** (outcomeId, skillId, weight) — join.
- **Prerequisite** (fromSkillId, toSkillId, type) — DAG edges.
- **LearningResource** (id, type, provenance: verified/sourced/ai-generated).
- **LearningActivity** (learner-facing task).
- **Assessment** + **AssessmentAttempt** (evidence).
- **LearningEvidence** (id, attemptId, skillId, dimension, weight, source) — dimension enum.
- **MasteryState** (learnerId, skillId, level, confidence, lastEvidenceAt, needsReviewAt).
- **ReviewSchedule** (spaced repetition).
- **LearnerGoal** + **LearningPathway** (ordered skill sequence).

## Versioning
Frameworks carry `version` + `effectiveFrom`; learner progress references framework version id; revisions create new framework version, never mutate old.

## Ownership
Domain types are provider-agnostic, store/UI/DB-free; persistence adapters map them. Skill identity (slug) canonical across curricula.

## Trade-offs
Reuse skill slugs across frameworks (normalization) vs framework-specific nuance (handled via OutcomeSkillLink weights, not new skills). Keep graph acyclic for prerequisites where possible; treat cycles as modelling errors.