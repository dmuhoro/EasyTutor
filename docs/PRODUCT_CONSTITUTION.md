# Product Constitution — EasyTutor (Personal Learning Operating System)

Ratified 2026-11-01. Governs product decisions alongside `CONSTITUTION.md` (engineering).

## Mission
Help anyone learn almost anything, at any level, independently, with a bias toward reasoning, mastery, retention and real-world application. Kenya is first context, not the limit.

## Target learners
School learners (8-4-4/CBC/CBE), university/professionals, vocational trainees, self-directed/independent learners, hobbyists/researchers.

## Core educational principles
1. Learner independence is the ultimate objective.
2. Socratic learning: question, probe, hint, guide discovery; never shortcut to answers by default.
3. Progressive difficulty by demonstrated capability, not lesson sequence.
4. Cognitive development across recall → comprehension → application → analysis → reasoning → evaluation → creation → transfer.
5. Retention: active recall, spaced practice, interleaving, cumulative review.
6. Evidence-based mastery from demonstrated proof, not completions/points.
7. Curriculum independence: curricula describe pathways, never the platform's teachable scope.
8. Knowledge provenance: distinguish verified resources, sourced claims, AI explanation.
9. Offline resilience.
10. Privacy and child-safety (minors).
11. Model independence (no single-provider dependency).
12. Simplicity in domain concepts.

## Learning experience principles
- Mistakes are diagnostic signals, not failures.
- Feedback explains why, not only correctness.
- Hints escalate gradually; answers are last resort and never rewarded as mastery.
- Learner controls pace/goals; system nudges, doesn't force.

## AI role and boundaries
- AI teaches thinking: questions, hints, misconceptions, reasoning scaffolds, exercise generation, explanations of errors.
- AI never arbitrarily awards mastery or fabricates learner state (per CONSTITUTION Art II).
- Deterministic core owns progress/mastery/assessment truth; AI interprets/recommends only.
- Every AI output may be challenged; provenance recorded.
- Model-agnostic routing with fail-closed fallbacks.

## Assessment and mastery philosophy
- Mastery is evidence-based, tiered (recall/understanding/application/analysis/reasoning/evaluation/creation/transfer/retention).
- Evidence types carry different weight; a correct MCQ < explained solution < transfer in new context.
- Prerequisites gate progression; readiness, not enrollment.
- Retention decay triggers review recommendations.

## Curriculum independence
- Skills exist independent of any curriculum; curricula reference skills/outcomes.
- Frameworks versioned; historical progress pinned to framework version.
- No framework may constrain teachable content.

## Accessibility & offline
- Local-first operation; graceful degradation; readable low-bandwidth mode; assistive-friendly.

## Privacy & child safety
- Data minimization; age-aware interactions; no PII in AI prompts beyond necessity; server-side secret handling; RLS; learner owns data export/delete.

## Long-term direction
Universal learning OS; extensible to new frameworks/subjects/disciplines without core rewrite; research-friendly data model.

## Non-goals / anti-patterns
- Not a lesson-completion game (points≠mastery).
- Not a single-model wrapper.
- No microservices/speculative infra without concrete need.
- No silent drops; no fail-open defaults.
- No duplicate skill definitions for same underlying competency.