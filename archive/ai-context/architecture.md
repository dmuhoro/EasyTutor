# Architecture: EasyTutor (updated)

... (previous content unchanged) ...

## Adaptive Curriculum Engine (Sprint 5 Day 4)
- **File:** `lib/adaptiveCurriculumEngine.ts`
- **Status:** Complete
- **Purpose:** Determines the optimal learning path for a learner, explains reasoning, and predicts next milestones.
- **Integration Points:** Consumed by `lib/recommendations.ts` and displayed in `StudentLearningDashboard`.
- **Boundaries:** Reads from `learning_identity` and `knowledge_graph` layers, writes to `adaptive_learning_paths` table (see `db-contracts.md`).

# End of Architecture
