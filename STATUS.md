# STATUS — EasyTutor

Single source of truth for what is **live**, what is **stubbed**, and what is **blocked**.
Claims here are verified against the code and CI gates — they are not trusted.

**Version:** 1.0.0 · **Expo SDK:** 55 · **React Native:** 0.83.6 · **Last verified:** 2026-09-12
**Branch:** `release/v1.0.0`

---

## Green gates (run and passing this session)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors (was 26 before the build-blocker fix) |
| Lint | `npm run lint` (eslint flat config) | ✅ 0 errors (gate is now real: `\|\| true` removed; was 4960 false errors from a bad config) |
| Tests | `npm test` (vitest) | ✅ 41 files / 181 tests passing (suite is scoped to the live app path; see CHANGELOG 1.0.1) |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations |
| QA runner | `node scripts/qa/qa_runner.js` | ✅ All systems verified. Ready for release. |
| Production web export | `npx expo export --platform web` | ✅ Exported `dist/` (Vercel build gate) |

---

## Live (verified in code + gates)

- **Core loop wiring**: auth → subject selection → AI tutor chat → quiz → progress, present in `app/` + `store/` + `data/` + `lib/`.
- **Portal scoping**: `portalFromMode()` in `store/roadmapStore.ts` resolves `high_school` / `university` / `knowledge_explorer`; governed reads/writes in `src/infrastructure/database/` require a portal and stamp `user_id`/`portal_type`/`updated_at`. Hardcoded `'student'` portal strings removed across `lib/mastery.ts`, `lib/knowledgeGraphEngine.ts`, `lib/learningPlanEngine.ts`, `lib/adaptiveCurriculumEngine.ts`, `hooks/useOrchestration.ts`.
- **Learning engines on the app path**: mastery, performance, trends, spaced repetition, weakness prediction, interventions, learning plan, adaptive curriculum, knowledge graph, learning coach — all compile and are covered by the 181-test suite.
- **Source tree is app-scoped**: `src/` contains only layers reachable from the app surface (madge-verified). Retired non-portal ecosystems (`src/api`, `billing`, `business`, `commercial`, `growth`, `market`, `maturity`, `productization`, `products`, `reliability`, `sdk`, `services`, `stabilization`, `ux`) and unreachable agents/infrastructure/observability/runtime/knowledge subtrees were archived to `archive/src/` (0% reachability, never deleted).
- **Lint gate is real**: `npm run lint` fails on errors (the previous `\|\| true` swallow was removed). 0 errors; 131 unused-var warnings tracked as backlog.
- **AI reliability wrapper**: timeouts, exponential-backoff retries, multi-provider fallback, explicit source reporting (`cache`/`local`/`cloud`/`offline_fallback`) in `lib/ai/reliability.ts`.
- **AI routing model**: cloud = `claude-3-5-sonnet-latest` (Anthropic), fallback = `llama-3.1-8b-instant` (Groq), local = role-based Ollama routing (`lib/ollamaModels.ts`) with settings `ollamaChatModel` (default `deepseek-r1:14b`) and `ollamaEmbeddingModel` (default `nomic-embed-text`); trailing `/v1` stripped; a missing model fails closed with the exact `ollama pull` command (never silently swapped). Roadmap generation reports an explicit provider (`local_ollama` / `cache` / `placeholder`) and falls back to an honest starter plan offline. Web export bundles without dead dependencies.
- **Local AI model slots + availability (L1/L3)**: `/api/tags` detection surfaces AVAILABLE / NOT PULLED / UNKNOWN per role (reasoning, agent, coding, embedding) in Settings; chat and embedding models are user-editable; a one-time, non-blocking startup warning fires when local AI is on and the embedding model is not pulled.
- **RAG wired into the tutor chat (L2)**: `app/(tabs)/study.tsx` retrieves top-3 document chunks per user message and injects them into the system prompt (fail-open on retrieval failure, with a visible "retrieving from your docs" indicator); `app/explore.tsx` "Ask AI Tutor" pre-loads a free-form learning goal into `/study`.
- **Live-proof artifacts (L1)**: `supabase/migrations/run-all.sql` is a paste-ready rollup of the two 2026-09-12 migrations (vector extension guard, drops legacy 2-arg/3-arg `match_document_chunks`, then adds the hardened RPC + Polymath schema); `scripts/live-proof-checklist.md` lists 10 end-to-end flows with expected/fail-closed behavior.
- **Polymath (free-form) learning identities**: `learning_goals` (RLS, unique `(user_id, topic)`) persisted through the governed layer (`learningOrchestrator.saveLearningGoal` / `listLearningGoals`); `roadmapStore` free-form save + task progress sync write to it idempotently and `fetchSavedRoadmaps` rehydrates across devices, local-first.
- **Real RAG (was silently broken)**: `match_document_chunks` is now an 8-arg RPC scoped by portal/taxonomy/curriculum/school/namespace and returns `metadata`; `document_chunks` is self-owned (`user_id`) with metadata + scope columns and RLS. Real ingestion (`lib/knowledge.ts`, deterministic chunk ids, governed writes) with embedding fail-closed (`generateEmbedding → null`); the knowledge workspace shows honest stored/failed counts. Exercise of the full path is covered by `tests/flows/polymath.flow.test.ts`.
- **Offline-first stores**: `store/` (zustand) + `data/` local persistence; Supabase sync paths via governed layer; local missions are never overwritten by a cloud refresh.
- **Build/deploy**: `vercel.json` build command (`npx expo export --platform web`) succeeds on HEAD. GitHub remote `dmuhoro/easytutor` (HTTPS).

## Stubbed / partial (documented, not silently assumed)

- **Live-network round-trips**: sourcing roadmaps/quizzes/progress against a real cloud
  Supabase instance and a physical Ollama endpoint (Expo Go) is not proven this session —
  needs env credentials and a device on the same network. Static schema↔code alignment +
  the mock-driven suite (incl. `polymath.flow`, `ollama.offline`) are the substitution.
- **Momentum/trend persistence to Supabase**: engine logic live; cross-device round-trip against a live cloud instance is not proven in this session (needs real env credentials).
- **Commerce/payments**: fully archived (`archive/lib/commerce`). Re-introduction requires a spec (Constitution Article II.3).

## Blocked (needs something outside the repo)

- Live Supabase + provider credentials (anon/service keys) are required to prove real-network sync and cloud AI round-trips; `.env*.local` is git-ignored by design.
- Physical-device verification (auth → chat → quiz → progress on Expo Go) requires a device on the same network.
- Current Vercel deployment is **HEAD** at `easytutor-ten.vercel.app` (project `easytutor`
  under scope `dmuhor01`, deployed via CLI from the v1.0.0 `release/v1.0.0` branch —
  build command `npx expo export --platform web`). The earlier `easytutor-omega`
  alias is **provably stale** (pre-L1 bundle: no `Polymath`, no `nomic-embed-text`,
  no `match_document_chunks`) and is superseded by the `ten` alias per the live-proof
  redeploy decision.
- Screen-by-screen verification evidence for this release: `sprints/sprint_8_live_proof_rag_and_verification.md`
  (hash-verified, every cited commit real) + `docs/evidence/2026-09-12-live-proof-sprint-scoped-checklist.md`.

## Known gaps (honesty over optimism)

- `any`-typed sites still exist in `src/`/`lib/` (identified in the audit, non-blocking); a strict `no-explicit-any` pass is a backlog item.
- 131 ESLint `no-unused-vars` warnings remain across `lib/`, `src/` and tests (unused imports/params). They do not fail the gate; a cleanup pass is backlog.
- The 22 best-effort empty `catch` blocks in `lib/` (AsyncStorage/cache fallbacks) are now explicitly commented as deliberate fall-throughs; surfacing cache-write failures to callers (vs. silent best-effort persist) is a tracked hardening item.
- Tests cover 41 files on the live app path; the 29 suites that only exercised the archived non-portal layers were archived with them (that coverage provided no protection for the learner path).
- Embedding needs an embedding-capable Ollama model; retrieval is honest (returns `[]`, never a false match) when the model does not support `/api/embeddings`.