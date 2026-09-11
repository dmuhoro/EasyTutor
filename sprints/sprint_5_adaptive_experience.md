# Sprint 5: Adaptive Experience / Learning Intelligence

**Status:** Completed (verified green: typecheck 0 errors, 255 tests, boundary audit 0 violations, QA runner pass)
**Version Target:** 1.0.0
**Focus:** Adaptive curriculum, learning identity, knowledge graph, coach engine, gamification, consolidation

---

## Sprint Objectives
1. **Adaptive Learning Coach Dashboard**: Learning Health Score, risks, next actions, study plan, trend cards
   (`app/(shared)/learning-dashboard.tsx`).
2. **Learning Identity & Knowledge Graph**: identity engine, knowledge-graph engine with topological
   ordering, adaptive level navigation, Math/Science/CS seed data
   (`lib/learningIdentityEngine.ts`, `lib/knowledgeGraphEngine.ts`, `lib/knowledgeGraphSeeds.ts`,
   `components/AdaptiveLevelNavigation.tsx`, migration `20260606_learning_identity_graph.sql`).
3. **AI Learning Coach Engine**: root-cause analysis for confidence/retention/mastery/trends/prerequisites,
   coaching strategy generation, milestone prediction, personalized messaging
   (`lib/learningCoachEngine.ts`, `lib/recommendations.ts`, `tests/learningCoachEngine.test.ts`).
4. **Adaptive Curriculum Engine**: optimal learning path, reasoning explanation, next-milestone prediction
   (`lib/adaptiveCurriculumEngine.ts`) + gamification/momentum systems.
5. **Consolidation**: Sprint 4 audit — 2 critical bugs fixed, 3 missing migrations created, all gates green.

## Key Files
- `lib/adaptiveCurriculumEngine.ts` — adaptive path computation + persistence
- `lib/knowledgeGraphEngine.ts`, `lib/learningIdentityEngine.ts`, `lib/learningCoachEngine.ts`
- `app/(shared)/learning-dashboard.tsx` — coach-style dashboard entry point
- `supabase/migrations/20260606_*` — learning identity/graph/coach reports
- `tests/adaptiveCurriculumEngine.test.ts`, `tests/learningCoachEngine.test.ts`

## Validation & Verification Checklist
- [x] TypeScript validation green
- [x] Architecture boundary validation green
- [x] QA runner green
- [x] Build-blocker fix (Sprint 6) keeps this layer compiling on the app path