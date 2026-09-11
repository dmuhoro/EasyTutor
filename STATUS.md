# STATUS — EasyTutor

Single source of truth for what is **live**, what is **stubbed**, and what is **blocked**.
Claims here are verified against the code and CI gates — they are not trusted.

**Version:** 1.0.0 · **Expo SDK:** 55 · **React Native:** 0.83.6 · **Last verified:** 2026-09-11
**Branch:** `release/v1.0.0`

---

## Green gates (run and passing this session)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors (was 26 before the build-blocker fix) |
| Tests | `npm test` (vitest) | ✅ 68 files / 255 tests passing |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations |
| QA runner | `node scripts/qa/qa_runner.js` | ✅ All systems verified. Ready for release. |
| Production web export | `npx expo export --platform web` | ✅ Exported `dist/` (Vercel build gate) |

---

## Live (verified in code + gates)

- **Core loop wiring**: auth → subject selection → AI tutor chat → quiz → progress, present in `app/` + `store/` + `data/` + `lib/`.
- **Portal scoping**: `portalFromMode()` in `store/roadmapStore.ts` resolves `high_school` / `university` / `knowledge_explorer`; governed reads/writes in `src/infrastructure/database/` require a portal and stamp `user_id`/`portal_type`/`updated_at`. Hardcoded `'student'` portal strings removed across `lib/mastery.ts`, `lib/knowledgeGraphEngine.ts`, `lib/learningPlanEngine.ts`, `lib/adaptiveCurriculumEngine.ts`, `hooks/useOrchestration.ts`.
- **Learning engines on the app path**: mastery, performance, trends, spaced repetition, weakness prediction, interventions, learning plan, adaptive curriculum, knowledge graph, learning coach — all compile and are covered by the 255-test suite.
- **AI reliability wrapper**: timeouts, exponential-backoff retries, multi-provider fallback, explicit source reporting (`cache`/`local`/`cloud`/`offline_fallback`) in `lib/ai/reliability.ts`.
- **AI routing model**: cloud = `claude-3-5-sonnet-latest` (Anthropic), fallback = `llama-3.1-8b-instant` (Groq), local = settings `ollamaModel` (default `llama3`) via Ollama. Web export bundles without dead dependencies.
- **Offline-first stores**: `store/` (zustand) + `data/` local persistence; Supabase sync paths via governed layer.
- **Build/deploy**: `vercel.json` build command (`npx expo export --platform web`) succeeds on HEAD. GitHub remote `dmuhoro/easytutor` (HTTPS).

## Stubbed / partial (documented, not silently assumed)

- **Local AI on device**: Ollama endpoint wiring (`lib/embeddings.ts`, `src/intelligence/routing/localLLMRouter.ts`) points at the settings-store endpoint and strips `/v1`; end-to-end behavior on a physical device via Expo Go is not verified this session (needs a device + reachable Ollama).
- **RAG / document ingestion**: decision recorded in `docs/adr/ADR-003`; runtime modules are archived (`archive/lib/ingestion`, `archive/lib/retrieval` retained). Not part of the 1.0 core loop.
- **Momentum/trend persistence to Supabase**: engine logic live; cross-device round-trip against a live cloud instance is not proven in this session (needs real env credentials).
- **Commerce/payments**: fully archived (`archive/lib/commerce`). Re-introduction requires a spec (Constitution Article II.3).

## Blocked (needs something outside the repo)

- Live Supabase + provider credentials (anon/service keys) are required to prove real-network sync and cloud AI round-trips; `.env*.local` is git-ignored by design.
- Physical-device verification (auth → chat → quiz → progress on Expo Go) requires a device on the same network.
- Current Vercel deployment (`easytutor-omega.vercel.app`) still serves a stale export from 2026-05-11; re-deploying HEAD will now build successfully but requires a deployment action.

## Known gaps (honesty over optimism)

- `any`-typed sites still exist in `src/`/`lib/` (identified in the audit, non-blocking); a strict `no-explicit-any` pass is a backlog item.
- README/BRIEF previously advertised SDK 52 and an offline-default posture that diverged from the live routing; docs reconciliation is part of this sprint.
- Tests cover 68 files; screens with implicit-any params were cleared by the engine fixes, but screen-level coverage remains below the engine-level coverage.