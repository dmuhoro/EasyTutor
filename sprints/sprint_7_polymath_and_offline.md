# Sprint 7 — Engine Honesty, Offline/Ollama End-to-End, Polymath Mode

**Date:** 2026-09-12 · **Branch:** `release/v1.0.0` · **Predecessor:** Sprint 6 (Engineering OS Revival)

Sequential work, one unit at a time, per Constitution Articles I–VII. Every phase was
committed only after its own full green gate (typecheck · lint · tests · boundary audit ·
QA runner · web export).

## Phase D — Demolition of dead/silent layers

- `b906ff5` `refactor: demolition — archive dead files, drop unused deps` and
  `55b9ddd` `refactor: relocate stray src/ai-os docs to archive`.
- Removed fake/paths not on the app bundle; 30 dead source files archived (never deleted,
  kept in history via `git mv`).

## Phase A — Make the engine honest (`cd93c0d`)

- **DB migrations for what the code already claimed** (`20260912_product_hardening.sql`):
  full column sets on `quiz_sessions`, `user_progress`, `cached_roadmaps` (incl.
  `portal_type`, `updated_at`), plus `ai_feedback`, `user_feedback`, `knowledge_chunks`
  and RLS; `user_events` reconciliation; `subjects` CHECK fix; unique index on
  `cached_roadmaps`.
- `schema.sql` re-synced so bootstrap matches the migration base.
- Fail-closed UX: `FeedbackModal` surfaces real errors (`feedback_submitted_failed` event,
  full reset on close), roadmap save/`resolveTopicIdOrThrow` produce literal reasons
  (`[DB WRITE FAILURE] …`) instead of vague promises.

## Phase B — Offline/Ollama end-to-end (`a13ad11`)

- `callOllama` now hits the real `/api/chat` endpoint (strips trailing `/v1`) and reports
  which endpoint was used; `generateStudyRoadmap` returns an explicit `provider`.
- Settings defaults `http://localhost:11434` + `llama3.2`; settings screen gives honest
  LAN-IP / no-`/v1` guidance.
- Local-first roadmap persistence across boots/user switches without destroying local
  missions; `fetchSavedRoadmaps` merges instead of overwriting.
- Fast, honest failure on the self-directed page: provider banners (`local_ollama` /
  `cache` / `placeholder`) and a starter plan when offline, with celebration gated on
  real generation.

## Phase C — Polymath mode: free-form topics, real RAG (`642301b`)

- **Free-form learning identities**: `learning_goals` table (unique `(user_id, topic)`,
  RLS self-owned), written through the governed layer into `learningOrchestrator.saveLearningGoal`
  (fail-closed: `knowledge_explorer`-only) and rehydrated by `listLearningGoals` +
  `fetchSavedRoadmaps` merge (local-first, idempotent). `roadmapStore.saveRoadmap` no
  longer throws "cloud sync coming soon" for custom topics — it persists them.
- **Real, governable RAG**: the shipped `match_document_chunks` RPC was silently broken
  (3-arg signature + nonexistent `metadata` column → always `[]`). Replaced with an
  8-arg RPC scoped by `portal_type` / `taxonomy_scope` / `curriculum_scope` /
  `school_scope` / `vector_namespace`; `document_chunks` gained metadata + scoping
  columns and self-owned `user_id`. Real ingestion path in `lib/knowledge.ts`
  (documents + deterministic chunk ids, governed writes), embedding fail-closed
  (`generateEmbedding` → `null`), self-directed page shows honest stored/failed counts
  instead of the fake "Upload Book" flow. Fake `lib/documents.ts`/`lib/extraction.ts`
  archived.
- **PostgREST correctness**: removed the phantom `_matchFields` column that governedWrites
  injected into every row (real Supabase rejects unknown columns); the mock now derives
  upsert conflict keys from `onConflict` and gained `rpc` support so retrieval is
  testable through the real code path.

## Gates (verified after the final phase, pre-commit hook runs them every commit)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors (133 tracked warnings) |
| Tests | `npm test` | ✅ 41 files / 181 tests |
| Boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations |
| QA | `node scripts/qa/qa_runner.js` | ✅ All systems verified. Ready for release. |
| Build | `npx expo export --platform web` | ✅ Exported `dist/` |

Evidence: `docs/evidence/2026-09-12-polymath-and-offline.md`. Audit: `docs/audits/2026-09-12-polymath-codebase-audit.md`.