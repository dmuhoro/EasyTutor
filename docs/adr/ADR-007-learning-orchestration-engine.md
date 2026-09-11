# ADR 007: Learning Orchestration Engine

## Status
Accepted

## Context
EasyTutor had governed infrastructure and separate intelligence utilities, but learning flows could still be assembled by screens or feature modules through loose parameters. Sprint Omega.3 requires a centralized command layer that coordinates runtime context, retrieval, AI routing, mastery progression, recommendations, caching, telemetry, and prefetch.

## Decision
Introduce `src/intelligence` as the orchestration authority. `RuntimeContext` becomes the canonical contract for intelligence operations. `LearningOrchestrator` coordinates pipelines through `PipelineExecutor`, `HybridInferenceRouter`, `MasteryCoordinator`, `RecommendationEngine`, and `PredictivePrefetcher`.

## Consequences
- New lesson, quiz, tutoring, roadmap progression, mastery, and prefetch flows should enter through `learningOrchestrator`.
- UI integration remains a follow-up migration: screens still need to be moved behind orchestrator entry points.
- Telemetry emitted by intelligence services must use explicit `RuntimeContext` ownership rather than ambient portal store state.
