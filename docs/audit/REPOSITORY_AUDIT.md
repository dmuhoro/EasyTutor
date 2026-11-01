# Repository Audit — EasyTutor (Phase 0)

Date: 2026-11-01 (audit run). Source of truth documents: `CONSTITUTION.md`, `STATUS.md`, `README.md`, `docs/adr/*`, `sprints/*`.

## 1. Repository identity (verified)

- Repo: `dmuhoro/easytutor`, branch `release/v1.0.0`, version `1.0.0`.
- App entry: `package.json` `"main": "expo-router/entry"`. Router root `app/` with Expo Router layouts; `app/index.tsx`, `app/_layout.tsx`.
- Gates verified this run: `npx tsc --noEmit` → 0 errors; `npm test` → 41 files / 181 tests passing; `node scripts/architecture/validate_boundaries.js` → 0 violations; `node scripts/qa/qa_runner.js` → "All systems verified. Ready for release."

## 2. Verified discrepancies in documented versions

- **STATUS.md** claims "Expo SDK: 55, React Native: 0.83.6"; **README** badges same.
- **package.json** actuals: `expo: ^57.0.22`, `react-native: 0.86.3`, `react: 19.2.3`, `typescript: ~6.0.3`, `zustand: ^5.0.12`, `@supabase/supabase-js: ^2.100.0`.
- Git history shows `feat(sdk57)` commits; SDK 57 is the real rail. README/STATUS badges are stale — documentation lag, not code failure.
- Implication: docs must be refreshed; dependency-health audit should target SDK 57 / RN 0.86 peer ranges.

## 3. Application surfaces (verified, file paths)

- `app/(tabs)/{index,study,quiz,roadmap,settings}.tsx`
- Portal groups: `app/(high_school)/`, `app/(university)/`, `app/(self_directed)/`, `app/(ai_literacy)/`, `app/(shared)/`, `app/(auth)/`
- Entry: `app/onboarding.tsx`, `app/explore.tsx`, `app/profile.tsx`, `app/roadmaps/create.tsx`, `app/roadmaps/[id].tsx`

## 4. State & local persistence

- Stores: `store/{authStore,progressStore,roadmapStore,settingsStore,studyStore,syncQueueStore}.ts` (Zustand, AsyncStorage-backed).
- `portalFromMode()` in `store/roadmapStore.ts` resolves `high_school` / `university` / `knowledge_explorer`.
- Local-first sync written through governed layer; `syncQueueStore` records pending writes.

## 5. Database infrastructure & governance

- Governed layer: `src/infrastructure/database/{index,governedWrites,governedQueries,portalFilters,taxonomyGuards,retrievalPolicies}.ts`; `src/infrastructure/contextResolver.ts`.
- Schema/migrations under `supabase/{schema.sql, migrations/}`. Migrations include `20260403_portal_schema.sql`, `20260508_vector.sql`, `20260510_vector_scaling.sql`, `20260912_polymath.sql`, `20260912_product_hardening.sql`, `20260915_governed_cloud_sync.sql`, rollup `run-all.sql`.
- `document_chunks` self-owned with `user_id`, metadata & scope columns; `match_document_chunks` 8-arg RPC scoped by portal/taxonomy/curriculum/school/namespace (ADR-005).

## 6. AI providers & routing

- `lib/aiProvider.ts`, `lib/ai/reliability.ts` (timeout/retry/fallback, explicit source), `lib/ollamaModels.ts` (role routing: deepseek-r1:14b chat, hermes3:8b agent, qwen2.5-coder:7b coding, nomic-embed-text embedding); `/api/tags` availability detection.
- Cloud: Claude 3.5 Sonnet (`@anthropic-ai/sdk`); fallback Groq Llama (`lib/cloud`/env). Routing returns cache/local/cloud/offline_fallback.
- Missing model fails closed with exact `ollama pull` command (verified in `lib/ollamaModels.ts`).

## 7. RAG & knowledge retrieval

- `lib/knowledge.ts`, `lib/chunking.ts`, `lib/chunking/semanticChunker.ts`, `lib/embeddings.ts`, `lib/retrieval.ts`, `lib/retrieval/ranking.ts`.
- `data/knowledgeStore.ts`. Study screen `app/(tabs)/study.tsx` injects top-3 chunks into system prompt; fail-open with visible indicator.

## 8. Learning engines (verified on app path per STATUS)

- Mastery/performance/trends/spaced repetition/weakness prediction/interventions/learning plan/adaptive curriculum/knowledge graph/learning coach: `lib/mastery.ts`, `lib/performanceEngine.ts`, `lib/trendEngine.ts`, `lib/spacedRepetitionEngine.ts`, `lib/weaknessPredictionEngine.ts`, `lib/interventionEngine.ts`, `lib/learningPlanEngine.ts`, `lib/adaptiveCurriculumEngine.ts`, `lib/knowledgeGraphEngine.ts`, `lib/learningCoachEngine.ts`, `lib/learningIdentityEngine.ts`, `lib/sessionIntelligence.ts`.
- `src/intelligence/*` orchestrator/memory/reasoning/retrieval, `src/intelligence/orchestrator/learningOrchestrator.ts` (saveLearningGoal/listLearningGoals).

## 9. Archived functionality

- `archive/` (30 entries): retired src ecosystems (`src/api`, billing, business, commercial, growth, market, maturity, productization, products, reliability, sdk, services, stabilization, ux), unreachable agents/infra/observability; commerce at `archive/lib/commerce`; tests 29 suites archived. Never deleted.

## 10. Tests & quality

- Vitest 41 files / 181 tests, all passing this run. ESLint 0 errors (131 unused-var warnings backlog). Architecture boundary audit 0. QA runner all green.

## 11. Security/data-integrity observations (verified)

- QA governance audit warns raw Supabase access candidates: `lib/interventionEngine.ts`, `lib/learningCoachEngine.ts`, `lib/performanceEngine.ts`, `lib/questionBank.ts`, `lib/recommendations.ts`, `lib/trendEngine.ts`. Need audit whether these go through governed layer or bypass. (Assumption — requires code review; flagged as debt.)
- Constants have `any` sites in `src/`/`lib/` (STATUS acknowledges).
- 22 best-effort empty `catch` blocks in `lib/` (AsyncStorage/cache fallbacks) — deliberate fall-throughs commented.

## 12. Verified fact vs assumption

Verified: gate results this run, file existence, package.json version strings, git log. Assumptions: green = correct behavior (tests are mock-driven; live-network round trips unproven per STATUS).