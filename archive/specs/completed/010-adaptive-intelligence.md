# Spec 010: Adaptive Intelligence Engine

## Metadata
- **Status:** in-progress
- **Owner Agent:** builder
- **Risk Level:** medium
- **Architectural Impact:** medium
- **Dependencies:** None
- **Last Updated:** 2026-05-10

---

## Goal
Evolve the tutoring logic into a proactive adaptive teaching engine that tracks student confusion, learning velocity, and mastery trends.

## Design
- **Mastery Engine:** Calculate granular topic proficiency using a weighted history of quiz attempts.
- **Learning Profile:** Track user-specific learning styles and "confusion hotspots" where the student repeatedly fails.
- **Spaced Repetition:** Implement a basic Leitner-system foundation for scheduling topic reviews.

## Implementation Boundaries
- **Directory:** `lib/intelligence/`
- **Files:** `masteryEngine.ts`, `learningProfile.ts`, `spacedRepetition.ts`, `tutorModes.ts`.
- **Constraint:** Must remain deterministic and explainable.

## Dependencies
- `lib/progress.ts`
- `lib/sessionIntelligence.ts`

## Verification Requirements
- [ ] Mastery scores reflect recent improvements more heavily than old failures.
- [ ] Learning profile identifies "Weak Topics" correctly based on error patterns.
- [ ] Spaced repetition schedules are generated based on last success timestamps.

## Verification Checklist
- [ ] Implement `calculateMastery` with exponential weighting.
- [ ] Implement `identifyWeakTopics` logic.
- [ ] Implement `getReviewSchedule` for spaced repetition.
- [ ] Create specialized tutor mode prompts (Beginner, Exam Prep, etc.).

## Audit Trail
- 2026-05-10 - Initial Spec Created.
