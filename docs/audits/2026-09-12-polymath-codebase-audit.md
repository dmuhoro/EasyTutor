# Polymath Engine Codebase Audit — 2026-09-12

Scope: full read-only index of the live app path (Expo SDK 55, RN 0.83.6, branch `release/v1.0.0`).
Every claim below was verified against `file:line`. Nothing in `src/` (production) was modified or deleted.

---

## [1] What the architecture actually is (the real layer)

Reachable surface (import graph, madge-verified):
- `app/` — 38 files: portal tabs (`(high_school)`, `(university)`, `(self_directed)`, `(shared)`, `(tabs)`), onboarding, auth, root `_layout`.
- `components/` — 25 files wired into those screens.
- `store/` — 7 Zustand stores (settings, subject, profile, roadmap, quiz, progress, themes).
- `lib/` — the real AI + intelligence layer.
- `src/infrastructure/database/` — governed Supabase access via `portalFromMode` (Constitution Art. III).
- `supabase/` — 30 migrations + `schema.sql` + seeds (see §8).

Data/flow facts:
- Subjects are a **single source of truth**: `constants/subjects.ts` `SUBJECTS` = 14 KCSE, 5 university, 2 self-directed. `constants/topics.ts` hardcodes `topics` per subject.
- `high_school` / `university` portals are **locked to preset subjects/topics** (by design — curriculum portals).
- `self_directed` allows **free-form topic input**: `app/(self_directed)/index.tsx` → `generateStudyRoadmap(topic)` → roadmap + quiz. This is the "learn anything" (polymath) path.
- AI routing: `lib/api.ts:44-60` `callOllama`; `checkGroqAvailable` via `EXPO_PUBLIC_GROQ_API_KEY`.
- AI execution goes through `lib/ai/reliability.ts` `executeWithReliability` (timeout, retry, fallback, explicit source).

## [2] What works (verified live-path)

1. **KCSE & University tutoring** — end-to-end on device via ANTHROPIC/GROQ keys: lesson generation, quiz, adaptive difficulty, spaced repetition, streaks, roadmap + task tracking, dashboard. Gates: tsc 0, lint 0/139, 39 files/174 tests pass, boundary audit 0 violations, `expo export` OK, QA runner pass.
2. **Governance** — all DB via `src/infrastructure/database` + `portalFromMode`; no direct UI→Supabase calls.
3. **Local-first sync** — `SyncIndicator`, `lib/sync/syncEngine.ts`, offline status UI; netinfo gate.
4. **Adaptive curriculum + learning identity** — `lib/adaptiveCurriculumEngine.ts`, `lib/learningIdentityEngine.ts`, `lib/weaknessPredictionEngine.ts` all live-path.
5. **Settings UI** — `app/settings.tsx` (reachable via `router.push('/settings')`) exposes AI mode, model picker, Ollama host/port, defaults. Toggle wiring verified: `store/settingsStore.ts` `setUseLocalLLM` ⇄ `aiMode='local'`.

## [3] Broken or stubbed on live paths (fail-open or fake)

| # | Location | Problem | Severity |
|---|----------|---------|----------|
| B1 | `components/FeedbackModal.tsx:36,49` | Inserts into `ai_feedback` / `user_feedback` — **no `CREATE TABLE` exists in any migration or `schema.sql`**. Insert fails → caught → `logSupabaseError`, fail-open console-only. User believes feedback was sent. | **P0** |
| B2 | `store/roadmapStore.ts:210-239` | `saveRoadmap` throws `'[FATAL] topic_id resolution failed'` when topic is free-form (self-directed). `app/(self_directed)/roadmap.tsx:75,112` calls it unreservedly → **unhandled rejection**; free-form progress **cannot persist**. Polymath progress is lost across sessions. | **P0** |
| B3 | `lib/api.ts:49-52` + `store/settingsStore.ts:31` | Default `ollamaUrl 'http://localhost:11434/v1'` + `${base}api/chat` → endpoint **`/v1/api/chat`** (Ollama native is `/api/chat`). Default local-Ollama call 404s. Also `localhost` is wrong for any physical device. | **P0** |
| B4 | `lib/stt.ts` + `lib/voiceTutor.ts` | Voice input simulated: "We will simulate a delay and return a mocked transcript". Sends a **fake** voice reply to the AI tutor. Mislabels UI ("voice") with synthetic data. | P1 |
| B5 | `lib/cloud.ts:4,7` | Stub returning `''` (cloud AI key). Reachable from `src/intelligence/routing/cloudLLMRouter.ts` — import-reachable but not on the primary async path (`lib/api.ts`). Lie-by-reachability if kept; lying in code if shown. | P1 |
| B6 | `store/roadmapStore.ts:214` uses `learningOrchestrator.saveRoadmap` | Progress given to learning-orchestrator layer only; `knowledge_chunks` retrieval never invoked (`.rpc('match_document_chunks')` absent anywhere). RAG on your docs is not wired. | P1 |
| B7 | `lib/ai/reliability.ts` | `localOllama` provider is gated by `conservativeURIScope` (default true) on an EXPO var that defaults off — so local-only mode silently has no model and falls through. Need explicit failure localization, not silent fallback from a "chosen" provider. | P2 |

## [4] Local-LLM (Ollama) gap — how bad is it really

- Settings UI + store wiring: **real and complete** (toggle ⇄ `aiMode`, model picker, host/port). Good.
- Runtime call: **broken by default** (B3: `/v1` prefix + `localhost`).
- Hardcoded picker list `['llama3.2','mistral','phi3','gemma2']` vs store default `ollamaModel 'llama3'` — the default model isn't even in the picker. Inconsistent.
- `localLLMServices` requires `isOllamaAvailable` from an env var that is not set in `.env.example` flows (env is `.env*.local`-only; the env var is never declared → check is undefined → local never activates). So **the local path is effectively unreachable today** even though the UI implies it works.

**Score: 3/10.** Plumbing exists, default-to-working is broken.

## [5] Polymath gap — "learn anything" reality

- Free-form goal entry works (`(self_directed)/index.tsx` → `generateStudyRoadmap`).
- `generateStudyRoadmap` is real (`lib/api.ts`; AI-generated roadmap for any topic).
- **Persistence breaks** for free-form topics (B2) → after refresh, roadmap gone. Achievements/quizzes still record (via topic-less quiz scores), but the roadmap (the "plan") does not.
- Topic coding: `resolveTopicId` only resolves known presets (`constants/topics.ts`); arbitrary topics → `null` → hard throw.
- Knowledge base / document RAG: **not wired** (B6) — uploads are fake (`./lite.pdf` placeholder) and `.rpc('match_document_chunks')` never called.

**Score: 4/10.** The idea is present and half-plumbed; persistence + RAG are the two missing pieces.

## [6] Dead weight (in the live tree)

`lib/` files confirmed unused (import graph): `lib/analytics/queries.ts`, `lib/cache/semanticCache.ts`, `lib/cache/ttlCache.ts`, `lib/debug.ts`, `lib/diagnostics/envCheck.ts`, `lib/env.ts`, `lib/insights.ts`, `lib/intelligence/masteryEngine.ts` + `tutorModes.ts`, `lib/knowledgeGraphSeeds.ts`, `lib/path.ts`, `lib/performance.ts`, `lib/seeds.ts`, `lib/supabase.web.ts`, `lib/sync/conflictResolver.ts`, `lib/sync/syncEngine.ts` (duplicate of `services/syncEngine`), `lib/types.ts` (empty), `lib/data/learningEngine.ts`, `lib/data/learningContent.ts`, `lib/aiProvider.ts`. Also `store/onboardingStore.ts`, `store/views/`, `app/(shared)/settings.tsx` (unreachable duplicate), `components/ui/button.tsx` + `ui/icon.tsx` (nobody imports them).

Root artifacts: `dependency-cruiser.svg`, `dependency-graph.png`, `SPRINT_REPORT.md`, duplicate `vitest.config.js` + `vitest.config.ts`, and `@types/react` present in **both** `dependencies` and `devDependencies`.

## [7] Dependency audit (verified)

- Essential/live: `@anthropic-ai/sdk`, `@expo/vector-icons` (49 files), `@react-native-async-storage/async-storage` (7 stores + cache), `@react-native-community/netinfo` (SyncIndicator/syncEngine), `@supabase/supabase-js`, `clsx` (11 consumers), `expo`, RN core.
- Unused (safe to remove): `cross-fetch` (nothing imports it), `@testing-library/react-native` (0 tests use it), `lint-staged` (no hooks), `react-test-renderer` (0 usage).
- Dead-component-only (remove **after** archiving the dead UI): `class-variance-authority`, `lucide-react-native` (only `ui/button`+`ui/icon`).
- Questionable but bundled into expo toolchain (`app.json` plugins): `expo-dev-client`, `expo-updates` — keep unless a Vercel/device check shows they're unused.
- `autoprefixer` — postcss-only, keep with the build.

## [8] Supabase alignment (final)

CLI truth: `npx supabase` v2.115.0 present. **No `supabase/config.toml`** → `db lint` / `db diff` / local stack require `supabase init` + Docker + project link (needs your token). Static alignment performed instead; `supabase/.temp/` git-ignored.

| # | Finding | Severity |
|---|---------|----------|
| S1 | `quiz_sessions`, `user_progress`, `cached_roadmaps` exist **only in `schema.sql`**, not in any migration → a fresh DB built from migrations is missing them (app queries would fail). | **P0** |
| S2 | `user_events` defined **twice with incompatible schemas**: `20260506_habit_system.sql:1` (`event_type`/`payload`) vs `20260524_analytics_observability.sql:60` (`event_name`/`learning_mode`/`metadata`). `lib/ai.ts:102` matches habit schema; `lib/analytics.ts:174` matches analytics schema + writes an `event_id` column present in **neither** → one event path always fails. | **P0** |
| S3 | `ai_feedback` / `user_feedback` never created (B1). | **P0** |
| S4 | `knowledge_chunks` never created (B6). | P1 |
| S5 | `schema.sql` `subjects.level` CHECK allows `'self_directed'` but migration `20260403` still allows `'general'` → drift. | P1 |
| S6 | Dead schema (tables/views/function never queried): `documents`, `cached_responses`, `user_topic_progress`, `match_document_chunks`, legacy `*` columns. | P2 |

## Completion score (overall product readiness for real-world use)

| Domain | Score | Blocker |
|--------|-------|---------|
| Core KCSE/University tutoring | 8/10 | none |
| Governance + build gates | 9/10 | none |
| Local/offline Ollama | 3/10 | B3 + local-activation var |
| Polymath (learn anything) | 4/10 | B2 persistence + no RAG |
| Data layer / Supabase | 5/10 | S1, S2, S3 |
| Hardening/metrics | 6/10 | fail-open silences |
| Tree cleanliness | 5/10 | §6 dead weight + dep dupes |
| **Overall** | **5/10** | **P0 data-integrity + frozen free-form + broken local default** |

The app is safe for KCSE/university in-app tutoring now; it is **not** honest to claim polymath or offline/local mode today.

---

## Phase 2 — Demolition plan (executed only after you pick paths; nothing done yet)

### 2a. Archive (`git mv` → `archive/`)
1. `app/(shared)/settings.tsx` — unreachable duplicate of `app/settings.tsx`.
2. Dead `lib/` layer: `analytics/queries.ts`, `cache/semanticCache.ts`, `cache/ttlCache.ts`, `debug.ts`, `diagnostics/envCheck.ts`, `env.ts`, `insights.ts`, `intelligence/*` (masteryEngine, tutorModes), `knowledgeGraphSeeds.ts`, `path.ts`, `performance.ts`, `seeds.ts`, `supabase.web.ts`, `sync/conflictResolver.ts`, `sync/syncEngine.ts`, `types.ts`, `aiProvider.ts`, `data/learningEngine.ts`, `data/learningContent.ts`.
3. `store/onboardingStore.ts`, `store/views/`, `components/ui/button.tsx`, `components/ui/icon.tsx`.
4. Fake voice if not chosen for realization: `lib/stt.ts`, `lib/voiceTutor.ts` (move, never delete).
5. Stub routers + `lib/cloud.ts` if the cloud path isn't being built.
6. Root: `dependency-cruiser.svg`, `dependency-graph.png`, `SPRINT_REPORT.md`, redundant `vitest.config.js`.
7. Remove unused deps in the same change (deletions: `cross-fetch`, `@testing-library/react-native`, `lint-staged`, `react-test-renderer`, `@types/react` from `dependencies`, and — after archiving UI — `class-variance-authority`, `lucide-react-native`).

### 2b. Rewrite / fix (the meat; P0 first)
- **Data (S1, S2, S3)**: one additive migration creating `quiz_sessions`, `user_progress`, `cached_roadmaps`, `ai_feedback`, `user_feedback`, `knowledge_chunks`; one migration reconciling `user_events` (single schema, back-compat column copy); optional drop-migration for dead tables. Update `schema.sql` to match migrations exactly.
- **Free-form persistence (B2)**: `saveRoadmap` fails closed with a clear reason instead of throwing blind; local-first roadmap storage so self-directed progress persists idempotently; `resolveTopicId` degrades to a generated topic id for arbitrary topics (or an explicit "learning identity" row).
- **Ollama (B3)**: strip `/v1` in `callOllama` (or change the default), make the device base URL explicit, unify model list (`llama3.2…`) on the store default, and gate local mode on a real, declared env var with a visible "no local model" error instead of silent fallback.
- **Feedback (B1)**: after table exists, surface failures to the user + metric, never silent.
- **STT (B4)**: either realize real device mic→text or remove the voice feature and its fake path.

### 2c. Keep (constitution-essential spine)
`lib/api.ts` core, `lib/ai/reliability.ts`, `lib/cache`, `lib/logEvent.ts`, `store/settingsStore.ts`, `constants/subjects.ts`, `src/infrastructure/database/*`, `portalFromMode`, `app/` screens, `tests/`, `scripts/{architecture,qa}`. Wrap the whole thing in one tight demo flow happy-path + one offline-flow sad-path test.

### 2d. Verification for whatever lands
`tsc --noEmit` 0; `npm run lint` 0 (139-warning backlog tracked, not hidden); vitest green + 1 new failure-path test (B2/B1 guard); `node scripts/architecture/validate_boundaries.js` 0; `node scripts/qa/qa_runner.js`; `npx expo export --platform web`; madge dead-code pass re-run post-archive; git history clean (one concern per commit).

---

## Phase 3 — Clarification (what the ecosystem can do once this executes)

After the chosen install:
- **A (Make the engine honest)**: The app refuses silently nothing — every broken/fake path becomes explicit, feedback arrives, metrics surface, and the red-gate is the only "done."
- **B (Offline/Ollama)**: sit in a plane; pick `local`; Ollama answers on `{your-LAN-IP}:11434`; the tutor works with zero cloud and zero fake data; no roadmap is lost (local-first).
- **C (Polymath)**: type any real-world topic — new topics, industries, hobbies, anything — the roadmap **saves**, quizzes record, learning identity builds; document RAG becomes real (upload → chunk → embed → retrieve) instead of a placeholder.
- **D (Demolition)**: the tree shrinks to the minimal spine; every file earns its place; deps drop from ~8 unused packages; the audit's dead-weight list is gone; and the repo is a truthful deck for the demo.

"Done is the honest, pinned-down, fail-closed version of each of the above — not this 60%:2-grade gap closed."