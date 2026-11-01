# Educational Architecture Gaps — EasyTutor (Phase 0)

Capability assessment against target Personal Learning OS.

| Capability | Existing support | Evidence | Gap |
|------------|------------------|----------|-----|
| Multiple curriculum frameworks | Partial — portals only (high_school/university/self-directed) | store/roadmapStore, src/knowledge/taxonomies/curriculum.ts | No pluggable curriculum framework registry; hardcoded portals |
| Kenya legacy 8-4-4 | Not implemented (KCSE/KICD only mentioned) | data/kcseSubjects.ts | 8-4-4 legacy topics/grading absent |
| CBC/CBE | Not implemented | — | No competency-based progression model |
| University education | Partial — portal + seed data | app/(university)/*, supabase/seed_university.sql | Needs multi-programme curricula, syllabus versions |
| Unrestricted independent learning | Partial — polymath free-form goals | learningOrchestrator.saveLearningGoal, polymath.flow test | Goal→roadmap orchestration exists but limited mastery integration |
| Curriculum-independent skills | Partial | lib/adaptiveCurriculumEngine, lib/weaknessPredictionEngine | Skills not modelled as first-class graph nodes independent of subject |
| Prerequisites & knowledge graphs | Partial — knowledge graph engine + prerequisite reasoner | lib/knowledgeGraphEngine.ts, src/intelligence/reasoning/prerequisiteReasoner.ts | Graph not persisted/versioned per learner across curricula |
| Socratic tutoring | Partial — prompts/Socratic? | lib/aiProvider.ts prompts, lib/voiceTutor.ts | No explicit Socratic turn policy/grading of learner reasoning |
| Adaptive difficulty | Present (adaptiveDifficulty, difficultyCalibrator) | lib/adaptiveDifficulty.ts, src/intelligence/reasoning/difficultyCalibrator.ts | Tuning + evidence needed; depends on mastery signals |
| Mastery tracking | Present (deterministic aggregation layer) | lib/mastery.ts, Constitution Art II | Good foundation; persist signals across devices verified only via mocks |
| Spaced retrieval | Present | lib/spacedRepetitionEngine.ts, lib/intelligence/spacedRepetition.ts | Scheduling integration with content not fully wired |
| Diagnostic assessment | Partial | quiz flows, questionBank | No diagnostic blueprint; placement logic missing |
| Transfer assessment | Not implemented | — | No cross-topic transfer task generation/grading |
| Learner-owned learning goals | Present | learning_goals (RLS, unique user+topic), learningOrchestrator | Good; needs richer goal metadata & milestones |

## Recommended target architecture (high level)

- Add a **Curriculum Framework Registry** (8-4-4, CBC/CBE, university programmes, free-form) versioned and selectable per learner; decouple portals from subject taxonomy.
- **Skill/Knowledge Graph** as persisted first-class entities with prerequisite edges, reused across curricula; learner mastery as attached property.
- **Assessment Engine** layer: diagnostic placement, formative item bank, transfer tasks; deterministic scoring feeding mastery aggregation.
- **Adaptive Engine** consuming mastery + spaced-repetition + difficulty calibration; Socratic dialogue policy as an AI prompt contract with explicit reasoning rubric.
- Retain local-first + governed sync model; extend schema via migrations (not edit existing).

## Proposed sequence

Phase 0 (this doc set) → Phase 1: curriculum registry + 8-4-4/CBC schemas → Phase 2: skill graph persistence + prerequisites → Phase 3: diagnostic/transfer assessment → Phase 4: Socratic policy + adaptive tuning → Phase 5: multi-tenant data isolation & child-safety hardening.

## Acceptance (per phase) to be refined in PHASE_0_ACCEPTANCE.md.