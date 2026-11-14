# Sprint 15 — Wiring Matrix (Phase 0.2 Audit)

**Date:** 2026-11-14  
**Scope:** Every screen and route in the EasyTutor web/PWA codebase (`app/` routes lazy-loading `screens/` components).  
**Method:** Static code audit of each screen component; data-source classification verified against imports and store/library calls. No runtime execution performed for this matrix (Phase 0 is audit-only; no feature code).

## Classification Legend

| Class | Meaning |
|-------|---------|
| **BACKEND** | Reads/writes via Supabase governed layer (`src/infrastructure/database`, `Database.governedQuery`/`governedWrite`, `supabase.auth`), the server-side `ai-proxy`, or Ollama `/api/tags` network call. Requires network/auth. |
| **LOCAL-ONLY** | Reads/writes via Zustand stores persisted to `AsyncStorage`, static constants, or local cache. Works offline. |
| **MOCK / HARD-CODED** | Static, invented, or placeholder data (e.g. hard-coded "24 Units Done", "Gold" league) that does not reflect real learner state. Must be replaced in Phase 2. |

**Data-source priority:** A screen is classed `BACKEND` if any of its primary data (progress, roadmaps, AI answers, literacy content) is fetched from/written to Supabase or the AI proxy. A screen is `LOCAL-ONLY` if all persistent state is AsyncStorage and no network call is made for core data. Hybrid screens show both.

**Handling status columns:** `Loading` = has explicit loading/skeleton state; `Empty` = has empty/zero-state UI; `Error` = has explicit error/retry UI; `Offline` = functions meaningfully without network.

---

## 1. Route / Screen Wiring Matrix

| # | Route | Screen file | Data source | Loading | Empty | Error | Offline | Notes |
|---|-------|-------------|-------------|---------|-------|-------|---------|-------|
| 1 | `/` | `app/index.tsx` | BACKEND (authStore session) + LOCAL-ONLY (roadmapStore) | ✅ ActivityIndicator | — (redirects) | — | ⚠️ Partial (cached session works; redirect decision local) | Auth gate: no session → `/(auth)/login`; no onboarding → `/onboarding`; else CommandCenter |
| 2 | `/(auth)/login` | `app/(auth)/login.tsx` | **BACKEND** (Supabase `auth.signUp`/`signInWithPassword`/`signInWithOAuth`) | ✅ `loading` state + Button `loading` | — | ✅ Toasts (error variants) | ❌ Explicit "Offline mode" toast — auth needs connection | Sign-in + sign-up + Google OAuth; email-confirmation message on sign-up |
| 3 | `/(auth)/_layout.tsx` | `app/(auth)/_layout.tsx` | LOCAL-ONLY (layout shell) | — | — | — | ✅ | Route layout only, no data |
| 4 | `/(tabs)` | `screens/tabs/index.tsx` | LOCAL-ONLY (progressStore/roadmapStore AsyncStorage) + BACKEND sync (`fetchSavedRoadmaps`, `syncQueuedTasks`, `syncPendingProgress`, governedQuery/governedWrite) | ✅ `pendingProgressSync` sync banner | ✅ "Welcome to EasyTutor" empty state | ✅ try/catch → `logError` | ✅ Local-first; sync on reconnect | Dashboard: streak, XP, topics mastered, next-best-action, roadmaps, subjects |
| 5 | `/(tabs)/study` | `screens/tabs/study.tsx` | LOCAL-ONLY (studyStore chat + AsyncStorage cache, static SUBJECTS) + **BACKEND** (`retrieveRelevantChunks` RPC, `askTutor` via ai-proxy/Ollama, governedWrite `markTopicDone`) | ✅ `loading` + skeleton | Offline cached topics | ✅ Fallback message + retry | ⚠️ Partial (cached responses + offline topics; AI + RAG need connection) | Socratic tutor chat (Explain/Teach & Quiz/Quiz Me/Summary), RAG citations `[Source ChN p.P]`, chapter picker |
| 6 | `/(tabs)/quiz` | `screens/tabs/quiz.tsx` | LOCAL-ONLY (progressStore) + **BACKEND** (`useQuizQuestionGeneration` → AI pipeline, governedWrite `addQuizScore`/`recordWrongAnswer`, `FeedbackModal`) | ✅ `loading` | ✅ "Not covered in your notes" | ✅ Retry button | ⚠️ Partial (AI question generation needs connection) | 10-question quiz, wrong-answer review, weak-spot links to tutor |
| 7 | `/(tabs)/roadmap` | `screens/tabs/roadmap.tsx` | LOCAL-ONLY (roadmapStore AsyncStorage) + BACKEND (`fetchSavedRoadmaps` governedQuery) | — | ✅ "No Active Mission" | ✅ Alert (delete) | ✅ Local-first | Active 7-day roadmap, task toggle, delete |
| 8 | `/(tabs)/settings` | `screens/tabs/settings.tsx` | LOCAL-ONLY (settingsStore, progressStore/roadmapStore/studyStore clear) + BACKEND (`signOut`) | — | — | ✅ Alert (sign-out error) | ✅ | Theme, offline mode, AI model picker, reset progress, sign out |
| 9 | `/(high_school)` | `screens/high_school/index.tsx` | LOCAL-ONLY (static `SUBJECTS`) | — | — | — | ✅ | Subject catalogue |
| 10 | `/(high_school)/[subject]/quiz` | `screens/high_school/[subject]/quiz.tsx` | LOCAL-ONLY + **BACKEND** (AI quiz generation) | — | — | — | ⚠️ Partial (AI needs connection) | Subject-specific quiz |
| 11 | `/(high_school)/[subject]/roadmap` | `screens/high_school/[subject]/roadmap.tsx` | LOCAL-ONLY + **BACKEND** (AI roadmap generation) | — | — | — | ⚠️ Partial (AI needs connection) | Subject-specific roadmap |
| 12 | `/(high_school)/[subject]/topics` | `screens/high_school/[subject]/topics.tsx` | LOCAL-ONLY (static `SUBJECTS`) | — | — | — | ✅ | Topic list |
| 13 | `/(university)` | `screens/university/index.tsx` | LOCAL-ONLY | — | — | — | ✅ | School list |
| 14 | `/(university)/[course]/quiz` | `screens/university/[course]/quiz.tsx` | LOCAL-ONLY + **BACKEND** (AI quiz generation) | — | — | — | ⚠️ Partial | Course quiz |
| 15 | `/(university)/[course]/roadmap` | `screens/university/[course]/roadmap.tsx` | LOCAL-ONLY + **BACKEND** (AI roadmap generation) | — | — | — | ⚠️ Partial | Course roadmap |
| 16 | `/(university)/school-details` | `screens/university/school-details.tsx` | LOCAL-ONLY | — | — | — | ✅ | School details |
| 17 | `/(self_directed)` | `screens/self_directed/index.tsx` | LOCAL-ONLY (roadmapStore) + **BACKEND** (`storeChunks` governedWrite to `document_chunks`, Ollama embeddings LOCAL) | ✅ `ingesting`/`importing` + progress bar | — | ✅ Alert (storage failed / parse errors) | ⚠️ Partial (Ollama local for embeddings; Supabase write needs connection) | Self-directed path, text ingestion, corpus.jsonl import (batch 50, progress bar) |
| 18 | `/(self_directed)/roadmap` | `screens/self_directed/roadmap.tsx` | LOCAL-ONLY + BACKEND (roadmapStore) | — | — | — | ✅ | Self-directed roadmap view |
| 19 | `/(self_directed)/quiz` | `screens/self_directed/quiz.tsx` | LOCAL-ONLY + **BACKEND** (AI quiz generation) | — | — | — | ⚠️ Partial | Self-directed quiz |
| 20 | `/explore` | `screens/explore.tsx` | **LOCAL-ONLY** (static `SUBJECTS`) | — | ✅ "Module not found" | — | ✅ | Subject catalogue + search + "Ask AI Tutor" goal pre-load |
| 21 | `/onboarding` | `app/onboarding.tsx` | **BACKEND** (`Database.governedWrite` `profiles`, `Database.getAuthenticatedUser`) + LOCAL-ONLY (roadmapStore) | ✅ `loading` + ActivityIndicator | — | ✅ catch → `console.error` + `setShowSuccess(false)` | ❌ Fails at governedWrite without connection | Portal selection (high_school/university/self_directed); writes `learning_mode`, `onboarding_complete` |
| 22 | `/profile` | `screens/profile.tsx` | **LOCAL-ONLY** (authStore user, progressStore, roadmapStore) | — | — | — | ✅ | Identity + mastery stats; contains **MOCK** hard-coded stats ("24 Units Done", "Gold", "12h Focus Time") |
| 23 | `/settings` | `screens/settings.tsx` | **LOCAL-ONLY** (settingsStore; Ollama `/api/tags` is LOCAL network, not Supabase) | ✅ `checking` state | — | — | ✅ (Ollama local) | Theme, Ollama URL + model slots, model-availability badges (AVAILABLE/NOT PULLED/UNKNOWN), PortalSwitcher |
| 24 | `/roadmaps/create` | `screens/roadmaps/create.tsx` | LOCAL-ONLY (`addRoadmap` local-first) + **BACKEND** (`generateRoadmap` → AI pipeline, `saveRoadmap` governedWrite) | ✅ `loading`/`generating` + ActivityIndicator | — | ✅ Alert ("Failed to generate roadmap") | ⚠️ Partial (local roadmap saved immediately; cloud sync deferred to queue on failure) | Generate 7-day curriculum from free-text goal |
| 25 | `/roadmaps/[id]` | `screens/roadmaps/[id].tsx` | LOCAL-ONLY (roadmapStore AsyncStorage) + BACKEND (`markRoadmapOpened` governedWrite) | — | ✅ "Roadmap Not Found" | ✅ Alert (delete confirm) | ✅ Local-first | Roadmap detail, day/task toggle, progress %, delete |
| 26 | `/ai_literacy` | `screens/ai_literacy/index.tsx` | LOCAL-ONLY (unit/UI state) + **BACKEND** (`fetchLiteracyContent`, `fetchLiteracyProgress`, `recordLiteracyQuizAttempt`, `saveLiteracyResumeState`, `touchLiteracyStreak` via `lib/aiLiteracy`) | ✅ `loading` + ActivityIndicator | — | — | ⚠️ Partial (progress/content needs Supabase) | Flagship AI Literacy module: units, quizzes, spaced review, remediation, mastery celebration, portal bridge |
| 27 | `/math-journey` | `screens/math-journey.tsx` | LOCAL-ONLY + **BACKEND** (diagnostic/practice via AI) | — | — | — | ⚠️ Partial | Mathematics diagnostic journey |
| 28 | `/(shared)/learning-dashboard` | `screens/shared/learning-dashboard.tsx` | LOCAL-ONLY | — | — | — | ✅ | Dashboard shell |
| 29 | `/(shared)/mastery` | `screens/shared/mastery.tsx` | LOCAL-ONLY | — | — | — | ✅ | Mastery view |
| 30 | `/(shared)/momentum` | `screens/shared/momentum.tsx` | LOCAL-ONLY | — | — | — | ✅ | Momentum view |
| 31 | `/(shared)/practice-session` | `screens/shared/practice-session.tsx` | LOCAL-ONLY | — | — | — | ✅ | Practice session |
| 32 | `/(shared)/progress` | `screens/shared/progress.tsx` | LOCAL-ONLY + BACKEND (progress sync) | — | — | — | ✅ | Progress view |
| 33 | `/(shared)/question-bank` | `screens/shared/question-bank.tsx` | LOCAL-ONLY | — | — | — | ✅ | Question bank |
| 34 | `/(shared)/settings` | `screens/shared/settings.tsx` | LOCAL-ONLY | — | — | — | ✅ | Shared settings shell |

### Summary counts
- **BACKEND (or hybrid with BACKEND):** 14 routes (1, 2, 4, 5, 6, 7, 8, 10, 11, 14, 15, 17, 21, 24, 25, 26, 27)
- **LOCAL-ONLY:** 18 routes (3, 9, 12, 13, 16, 18, 19, 20, 22, 23, 28–34)
- **No loading state:** 8 routes (3, 7, 8, 9, 12, 13, 16, 18–20, 22, 23, 25, 28–34)
- **No empty state:** 22 routes (all except 4, 6, 11, 20, 25)
- **No explicit error UI:** ~10 routes (rely on silent `logError`/toast-only)
- **Offline-not-working:** 3 routes (2, 21) plus partial offline on all AI/RAG routes (5, 6, 10, 11, 14, 15, 17, 24, 26, 27)

---

## 2. Component-Level Data Sources (shared UI components)

| Component | File | Data source | Notes |
|-----------|------|-------------|-------|
| FeedbackModal | `components/FeedbackModal.tsx` | **BACKEND** (`Database.governedWrite` `ai_feedback`/`user_feedback`, portal-stamped) | Routed through governed layer post-sprint-14 |
| QuizEngine | `components/QuizEngine.tsx` | LOCAL-ONLY (props: `customQuestions`) | Receives questions; does not fetch |
| RoadmapView | `components/RoadmapView.tsx` | LOCAL-ONLY (props) | Renders roadmap days/tasks |
| PortalHeader | `components/PortalHeader.tsx` | LOCAL-ONLY (roadmapStore `learningMode`) | Portal badge |
| PortalSwitcher | `components/ui/PortalSwitcher.tsx` | LOCAL-ONLY (roadmapStore) | Portal mode toggle |
| CanonicalQuizRenderer | `components/CanonicalQuizRenderer.tsx` | LOCAL-ONLY (props) | Quiz rendering |
| RouteFallback | `components/RouteFallback.tsx` | LOCAL-ONLY | Lazy-load fallback |
| CommandCenter | `components/CommandCenter.tsx` | LOCAL-ONLY (+ auth/roadmapStore via `app/index.tsx`) | Post-onboarding shell |
| Button / Chip / Toast / etc. | `components/ui/*.tsx` | LOCAL-ONLY (design tokens) | Presentational |

---

## 3. MOCK / HARD-CODED Inventory (Phase 2 replacement candidates)

These are static/invented values that do not reflect real learner state and must be replaced with governed data or curriculum-pack data in Phase 2.

| # | Location | Hard-coded value | Data source class | Problem | Phase 2 action |
|---|----------|------------------|-------------------|---------|----------------|
| M1 | `screens/profile.tsx` | `"24"` Units Done, `"Gold"` Active League, `"12h"` Focus Time, streak/streak-freeze badges | MOCK / HARD-CODED | Not real learner state; misleading | Wire to `progressStore`/`roadmapStore` real values |
| M2 | `lib/subjects.ts` | Static `SUBJECTS` catalogue (names, icons, topics) | HARD-CODED | Not curriculum-pack driven; no country/board/version | Replace with curriculum-pack JSON (Phase 4) |
| M3 | `screens/tabs/settings.tsx` | `"EasyTutor v1.0.4 Premium"` | HARD-CODED | Version drift vs `v1.0.0-beta` in root settings | Single version source of truth |
| M4 | `screens/settings.tsx` | `"EasyTutor v1.0.0-beta"` App Version | HARD-CODED | Drift vs tabs settings | Single version source of truth |
| M5 | `screens/roadmaps/create.tsx` | `"Powered by Claude & Llama"` | HARD-CODED | Provider claim not dynamic; may leak model names | Dynamic provider badge or remove |
| M6 | `screens/self_directed/index.tsx` | `"Automotive Science Principles"` default subject; `sd-automotive` / `GLOBAL_OPEN` scope | HARD-CODED | Example subject baked into UI | Configurable default; book text in PRIVATE scope only |
| M7 | Various screens | Literal greeting/copy strings inline in JSX | HARD-CODED | No i18n scaffolding | Phase 1 i18n (English complete; Swahili/French DRAFT) |

---

## 4. Handling-Quality Gaps (Phase 2 priorities)

| Gap | Routes affected | Severity |
|-----|-----------------|----------|
| Missing **empty state** | 1, 2, 3, 5 (partial), 7–10, 12–16, 18–23, 24–34 | High — blank/confusing states when no data |
| Missing **error UI** (silent `logError` only) | ~10 routes including shared screens | Medium — failures invisible to learner |
| Missing **loading state** | 3, 7, 8, 9, 12, 13, 16, 18–20, 22, 23, 25, 28–34 | Medium — no feedback during async |
| Offline-not-working | 2 (login), 21 (onboarding) | High — auth/onboarding hard-fail without connection |
| Partial offline (AI/RAG blocked) | 5, 6, 10, 11, 14, 15, 17, 24, 26, 27 | Medium — core tutor/quiz unusable offline |

---

## 5. Recommended Phase 2 Replacement Order (priority)

1. **Auth/onboarding offline resilience** (routes 2, 21): queue sign-in intent; allow offline onboarding with local profile, sync on reconnect.
2. **Profile mock stats** (M1): wire to real `progressStore`/`roadmapStore` values.
3. **Empty + error + loading states** on all routes lacking them (per gap table).
4. **Subject catalogue → curriculum packs** (M2): JSON schema + validator (Phase 4), replacing static `SUBJECTS`.
5. **Local-first AI tutor/quiz offline queue** (routes 5, 6, 17, 24, 26): queue AI requests, sync on reconnect, show sync state.

---

**Evidence basis:** Screen files audited directly (`screens/*.tsx`, `app/*.tsx`); store files (`store/authStore.ts`, `store/progressStore.ts`, `store/roadmapStore.ts`, `store/settingsStore.ts`, `store/studyStore.ts`); governed layer (`src/infrastructure/database/`); lib (`lib/knowledge.ts`, `lib/retrieval.ts`, `lib/api.ts`, `lib/aiLiteracy.ts`). All gate checks for this audit baseline passed in Phase 0.1 (typecheck 0, lint 0 errors, 263/263 tests, boundary 0 violations, public-env guard PASS, QA SUCCESS, web export PASS).
