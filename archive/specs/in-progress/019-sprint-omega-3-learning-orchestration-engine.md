# Spec 019: Sprint Omega.3 Learning Orchestration Engine

## Status
In Progress

## Objective
Create EasyTutor's centralized Learning Orchestration Engine: the command layer responsible for coordinating runtime context, governed retrieval, AI routing, adaptive pipelines, mastery coordination, semantic caching, telemetry, and predictive prefetching.

## Scope
- Create orchestration modules under `src/intelligence/orchestrator`, `runtime`, `pipelines`, `mastery`, and `prefetch`.
- Add deterministic AI routers for local, cloud, and hybrid inference.
- Introduce a canonical `RuntimeContext` consumed by intelligence services.
- Build production-oriented pipelines for lesson generation, quiz generation, remediation, spaced repetition, predictive continuation, and roadmap adaptation.
- Add orchestration telemetry events and contract tests.

## Non-Goals
- No cosmetic UI changes.
- No direct screen redesigns.
- No database migration rewrites.
- No speculative content authoring features.

## Acceptance Criteria
- Orchestrator exposes the only new coordination API for lesson, quiz, tutoring, mastery, roadmap, and prefetch flows.
- Pipelines consume `RuntimeContext` instead of loose parameter bags.
- AI routing deterministically handles offline, cache, local, cloud, and escalation decisions.
- Mastery coordination centralizes weak-point detection, decay, review scheduling, and XP recommendations.
- Predictive prefetch returns the next three probable learning nodes and warms semantic cache entries.
- TypeScript, governance audit, architecture boundary validation, and QA flow suite pass.

## Audit Trail
- 2026-05-12: Spec created from Sprint Omega.3 directive before implementation to satisfy repository spec-driven invariants.
- 2026-05-12: Added `RuntimeContext` and canonical context creation under `src/intelligence/runtime`.
- 2026-05-12: Added local, cloud, and hybrid inference routers with deterministic cache/offline/cloud decisions.
- 2026-05-12: Added pipeline executor, adaptive flow engine, mastery coordinator, recommendation engine, and predictive prefetcher.
- 2026-05-12: Added `LearningOrchestrator` as the command layer for lesson, quiz, tutoring, roadmap, mastery, and prefetch flows.
- 2026-05-12: Added orchestration contract tests covering runtime context, AI routing, mastery, predictive prefetch, and orchestrator lesson generation.
- 2026-05-12: Verification passed via `node scripts/qa/qa_runner.js` with TypeScript, boundary validation, governance audit, and 82 flow tests green.
