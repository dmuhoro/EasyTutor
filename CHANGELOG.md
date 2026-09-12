# Changelog

All notable changes to EasyTutor are documented here.
Format: [Semantic Versioning](https://semver.org) — project convention is
"one sprint, one meaningful entry".

---

## [Unreleased] — 1.0.2 (Live Network Proof, RAG Wiring, Model Split)

### Added
- **Sprint 8 — live-proof RAG & verification** (`docs/sprints/sprint_8_live_proof_rag_and_verification.md`):
  full verifiable sprint artifact cross-referenced here — every commit hash it cites is
  verified against this repo's history (0 fabricated hashes; `git rev-parse` cross-check
  recorded in `docs/evidence/2026-09-12-verify-every-hash-cited.md`).
- **L1 — live network proof scaffolding** (`0679030`):
  `supabase/migrations/run-all.sql` — a paste-ready rollup of the two 2026-09-12
  migrations (creates the `vector` extension if absent, drops the legacy 2-arg and
  3-arg `match_document_chunks` overloads, then applies the hardened 8-arg RPC +
  Polymath schema verbatim). `scripts/live-proof-checklist.md` — 10 end-to-end flows
  (auth, preset/free-form roadmaps, quiz, progress sync, learning goals, ingestion+RAG,
  Ollama connectivity, local inference, offline fallback) with expected and fail-closed
  behavior. Local AI model registry (`lib/ollamaModels.ts`) with role routing and
  `/api/tags` availability detection surfaced as model slots in Settings.
- **L2 — RAG wired into the tutor chat** (`b3af91f`): `app/(tabs)/study.tsx`
  retrieves the top-3 document chunks per user message and injects them into the system
  prompt (fail-open on retrieval error, with a visible "retrieving from your docs"
  indicator); `app/explore.tsx` "Ask AI Tutor" pre-loads a free-form learning goal into
  `/study`.
- **L3 — chat/embedding model split** (`22bcacc`): settings store now exposes
  `ollamaChatModel` (default `deepseek-r1:14b`) and `ollamaEmbeddingModel` (default
  `nomic-embed-text`); editable Reasoning/Chat and Embedding/RAG rows in Settings with
  availability badges; a one-time, non-blocking startup warning when local AI is on and
  the embedding model is not pulled.

### Changed
- Ollama calls resolve their model per role, honoring the configured model and failing
  closed (naming the exact `ollama pull` command) instead of silently swapping.
- Legacy `(tabs)`/`(shared)` settings screens adapted to the new model fields; the
  reliability and offline test mocks updated accordingly.
- `README.md` rewritten for the v1.0.0 capability set; `package.json` gained a
  description and keywords.

### Fixed
- `preserve-caught-error` lint failure in the Ollama network-error path (preserves the
  original error as `cause`).

---

## [Unreleased] — 1.0.1 (Engineering OS Revival + Green Gates)

### Added
- **Polymath mode — free-form topics, real RAG, arbitrary roadmaps** (`642301b`):
  `learning_goals` table (RLS, unique `(user_id, topic)`) gives every "learn anything"
  mission a stable cloud identity via the governed layer
  (`learningOrchestrator.saveLearningGoal`/`listLearningGoals`, `roadmapStore` free-form
  branch is now cloud-persistent instead of "coming soon"); `match_document_chunks` is a
  real 8-arg RPC (the deployed 3-arg variant silently failed every query — see evidence);
  real ingestion in `lib/knowledge.ts` with deterministic chunk ids, embedding
  fail-closed (`generateEmbedding → null`), and honest stored/failed counts in the
  self-directed knowledge workspace.
- `tests/flows/polymath.flow.test.ts` (7 tests) driving learning-goal idempotency,
  governance refusal, ingestion idempotency/fail-closure, and retrieval (with mock `rpc`
  support) through the real code path.

### Changed
- **Demolition of dead/silent layers** (`b906ff5`, `55b9ddd`): 30 unused sources archived
  (kept in history via `git mv`) and unused deps dropped from the app bundle path.
- **Offline/Ollama end-to-end** (`a13ad11`): `callOllama` uses the native `/api/chat`
  endpoint (drops trailing `/v1`) and reports the endpoint/provider used;
  `generateStudyRoadmap` returns an explicit provider; settings default to
  `http://localhost:11434` / `llama3.2`; roadmap store preserves local-first missions
  across boot/user switches and merges (never overwrites) cloud refreshes.
- `governedWrites` no longer injects a phantom `_matchFields` column into rows (real
  PostgREST rejects unknown columns); conflict keys travel via `onConflict`. Test mock
  mirrors this and gained `.rpc` support.

### Fixed
- **Engine honesty pass** (`cd93c0d`): DB migrations for claims the code already made
  (`quiz_sessions`, `user_progress`, `cached_roadmaps` full columns + RLS,
  `ai_feedback`, `user_feedback`, `knowledge_chunks`, `subjects` CHECK, `user_events`
  reconciliation); `FeedbackModal` fail-closed with real errors; roadmap save and
  `resolveTopicIdOrThrow` give literal `[DB WRITE FAILURE]` reasons.
- **RAG never worked**: `match_document_chunks` returned `[]` for every governed query
  (3-arg signature + nonexistent `metadata` column). Replaced + verified by tests.
- **Web export build blocker** (`lib/ai.ts`, `lib/ai/reliability.ts`): removed
  dangling imports of removed observability/tracing modules that broke Metro
  bundling and the `vercel.json` build gate (`npx expo export --platform web`).
  Verified: `dist/` exports cleanly on HEAD.
- **Portal-scope runtime bug**: hardcoded portal string `'student'` was not a
  valid `PortalType` and would throw at runtime whenever Supabase was online.
  Replaced everywhere with `portalFromMode(learningMode)` (`store/roadmapStore.ts`),
  fixing `lib/mastery.ts`, `lib/knowledgeGraphEngine.ts`,
  `lib/learningPlanEngine.ts`, `lib/adaptiveCurriculumEngine.ts`, and
  `hooks/useOrchestration.ts`. Engines restored to `lib/` and type-fixed.
- 26 typecheck errors → 0 (`npx tsc --noEmit` clean).
- **Lint gate was fiction**: `eslint.config.mjs` linted `archive/` and node
  scripts with wrong globals (no `console` etc.), producing 4960 false errors
  that `npm run lint` swallowed with `|| true`. Rewrote the flat config
  (ignore build/archive artifacts, proper Node globals for `.js`, TS unused-var
  patterns) and removed `|| true`; then fixed the remaining 33 real errors on
  the live path (22 deliberate empty catches made explicit, dead initializers,
  `no-case-declarations`, rethrow wrapper, empty `if`). Result: **0 errors**,
  139 unused-var warnings tracked as backlog.

### Changed
- `tsconfig.json` excludes `archive/`, `node_modules/`, `dist/` so dead code is
  out of the typecheck surface. `vitest.config.js` mirrors the exclude.
- **AI endpoint wiring**: `lib/embeddings.ts` and
  `src/intelligence/routing/localLLMRouter.ts` no longer depend on the archived
  `lib/bridge/localNetwork`; they read the settings-store Ollama URL and strip
  `/v1` for native Ollama `/api/*` calls.

### Removed (archived to `archive/`, never deleted)
- Dead layers not on the app bundle path: `lib/commerce`, `lib/ingestion`,
  `lib/bridge`, `lib/ollama.ts`, `lib/bookTutor.ts`,
  `lib/diagnostics/startup.ts`, `lib/cache/cacheMetrics.ts`, and their tests
  (`archive/tests/`).
- App-unreachable `src/` layers (madge-verified 0% reachability from the app
  surface, 506+ files): `src/api`, `src/billing`, `src/business`,
  `src/commercial`, `src/growth`, `src/market`, `src/maturity`,
  `src/productization`, `src/products`, `src/reliability`, `src/sdk`,
  `src/services`, `src/stabilization`, `src/ux`, plus unreachable subtrees of
  `src/agents`, `src/infrastructure`, `src/observability`, `src/runtime`,
  `src/knowledge` → `archive/src/`. Orphaned integration tests and
  `scripts/ingestion` that only exercised those layers were archived with them.
- **Test suite re-scoping**: 68 files / 255 tests → 39 files / 174 tests. The 29
  archived suites tested code that is no longer on the app path (commerce,
  sales/success ops, greenfield multi-tenant, stability/agent runtimes), so they
  provided no protection for the learner path. All 174 tests pass on the live
  app path.

### Governance
- Added `CONSTITUTION.md` (EasyTutor-scoped execution-safety doctrine).
- Added `STATUS.md` (verified live/stubbed/blocked source of truth).
- Migrated 7 historical ADRs (`archive/decisions/`) to `docs/adr/ADR-00x`.md.
- Added `docs/` tree (`adr/`, `sprints/`, `evidence/`, `changelog/`) and
  `sprints/` as the sprint record home per Constitution Article VI.

## [1.0.0] — 2026-05-11 (Production AI Infrastructure Launch)

- Production AI infrastructure launch (`02cbc30`): reliability wrapper,
  timeout/retry/fallback AI routing, analytics integrity + operational
  intelligence views, portal switching + identity split, knowledge workspace,
  roadmap-tutor link, unified command center, adaptive + governance layers.
- Expo SDK 55 / React Native 0.83 stabilization (lockfile, podfile-like asset
  sync, NativeWind v4 Metro/PostCSS, Reanimated worklets).
- Docker + EAS/build pipeline hardening for the web export.
- Sprint history 1–5 (KCSE question bank, practice engine, mastery tracking,
  adaptive recommendations, momentum, AI literacy, adaptive difficulty,
  confidence/accuracy, trend analysis, spaced repetition, learning risk,
  interventions, learning plans, adaptive curriculum, learning identity &
  knowledge graph, learning coach, gamification) — see `sprints/` and
  `docs/sprints/`.