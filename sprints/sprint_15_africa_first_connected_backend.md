# Sprint 15 — Africa-first learning platform: Phase 2 Connected Backend

Date: 2026-11-14.

Goal: Connect the EasyTutor frontend fully to the backend — remove MOCK/HARD-CODED and LOCAL-ONLY items from the wiring matrix, implement offline-first core loop with sync-on-reconnect, prove per-user private storage by tests, and add loading/empty/error states to all routes lacking them.

Interaction patterns inspired by Index 0 (visible staged tutoring loop, track/roadmap structure, guided setup wizard, mock exams instead of mock interviews, learner-owned content) — original design only; no code, prompts, copy, assets or methodology copied (Index 0 license forbids building a competing product from them).

## Phase 0 — Audit (complete, from previous session)

**0.1 Clean install + gates** — `rm -rf node_modules && npm ci`; lockfile unchanged (`1c3bed13...`), tree clean. All gates green: typecheck 0, lint 0 errors, 263/263 tests, boundary audit 0 violations, public-env guard PASS, QA SUCCESS, web export PASS.

**0.2 Wiring matrix** — `docs/evidence/sprint15-wiring-matrix.md`: all 34 routes classified BACKEND / LOCAL-ONLY / MOCK with loading/empty/error/offline status; mock/hard-coded inventory (M1–M7); handling-quality gaps; recommended Phase 2 replacement order.

**0.3 UX audit** — `docs/evidence/sprint15-ux-audit.md` + 16 screenshots (`docs/evidence/screenshots/`): 8 routes × 2 widths (390px mobile / 1280px desktop). Top-10 fixes ranked (onboarding 2500ms forced delay, mock profile stats, reset-without-confirm, mode-toggle tap targets, version drift, duplicate button, missing empty/error/loading states, login primary CTA, roadmap checkboxes, Explore entry points).

## Phase 1 — Foundations (complete, from previous session)

**1.1 Design tokens** — `src/design/tokens.ts` (MOTION token set + MotionMode type) + `src/design/reducedMotion.ts` (`useReducedMotion()`/`motionDuration()`).

**1.2 App shell** — `app/_layout.tsx` single Expo Router navigation stack, phone + desktop.

**1.3 Shared states** — `components/ui/EmptyState.tsx`: EmptyState, ErrorState, LoadingState.

**1.4 i18n scaffolding** — `src/locales/en.json` (complete), `sw.json`/`fr.json` (DRAFT), `TranslationProvider` + `useTranslation()` + `t()`.

**1.5 Low-data mode** — `store/settingsStore.ts` (`lowDataMode` + `dataUseKB`), `lib/useConnectionStatus.ts` (NetInfo auto-suggest), `components/LowDataBanner.tsx` (visible data-use estimate).

## Phase 2 — Connected Backend (complete, this session)

**2.1 Auth/onboarding offline resilience** — `store/authStore.ts` + `app/onboarding.tsx`:
- Sign-in intent queueing: `signInWithEmail`/`signUpWithEmail` queue intent when offline instead of failing
- `syncPendingAuth()` resumes queued intents on reconnect
- Module-load initialization checks for existing Supabase session so `isLoading` resolves
- Pending intents persist in AsyncStorage; re-queue if sync still fails (never silently dropped)
- Onboarding completes locally when `governedWrite` fails (offline); profile write queued; offline banner informs learner

**2.2 Profile mock stats (M1 resolved)** — `screens/profile.tsx`:
- "24" Units Done → `roadmaps.length` from roadmapStore
- "Gold" Active League → computed `level` from progressStore.getLevel(xpTotal)
- "12h" Focus Time → xpTotal-derived estimate (1 XP ≈ 1 minute)

**2.3 Loading/empty/error states** — `screens/tabs/index.tsx`:
- `isLoading` state with ActivityIndicator while data initializes
- `loadError` state with retry button and friendly error message
- Replaces silent-failure behavior

**2.4 AI tutor offline queue** — `store/studyStore.ts` + `screens/tabs/study.tsx`:
- `pendingAIRequests` queue with `enqueueAIRequest`/`dequeueAIRequest`/`clearPendingAIRequests`
- Persists in AsyncStorage, survives app restarts
- Failed AI requests enqueued instead of dead-end error; assistant replies "saved for later"
- On reconnect, queue processed automatically; answers delivered as new assistant messages
- Sync banner shows pending request count with clear option

**2.5 Per-user private storage (Constitution Article II)** — `tests/security/user-isolation.test.ts` (6 tests):
- `governedWrite` stamps `user_id` on `document_chunks` and `learning_goals` writes
- `governedQuery` filters by `user_id` so user B cannot read user A data
- User A can read their own data through `governedQuery`
- Both users coexist with separate data (quarantine test)

## Deferred

**CAT mode (P2)**: exam-style calculation questions with marks + deterministic mathjs answer verification. Deferred — `mathjs` could not be installed cleanly (`npm install` timed out leaving a corrupted partial install) and P2 is the lowest-priority task.

## Evidence

- `docs/evidence/sprint15-wiring-matrix.md` — route-by-route data-source classification
- `docs/evidence/sprint15-ux-audit.md` — UX audit with screenshots
- `docs/evidence/screenshots/` — 16 PNG screenshots (8 routes × 2 widths)
- `tests/security/user-isolation.test.ts` — per-user isolation test suite

## Gates (all green on clean `npm ci` install, lockfile unchanged)

- `tsc --noEmit` 0 errors
- `npm run lint` 0 errors (129 pre-existing unused-var warnings tracked as backlog)
- `npm test` 269/269 (sequential; 56 test files)
- `validate_boundaries.js` 0 violations
- `check_public_env_allowlist.mjs` PASS (only EXPO_PUBLIC_SUPABASE_URL / ANON_KEY client-bundled)
- `qa_runner.js` SUCCESS
- `npm run build` (web export) PASS

## Risks for next session (Phase 3 — Learning Journey UI)

- Setup wizard: country, level (secondary, TVET/technical, university, self-learner), curriculum/exam track (from packs), goal and exam date, daily minutes, language, data mode
- Home: today's plan, weak spots, next best action, progress; no dark patterns (no guilt streaks, no manipulative notifications)
- Tutor session: visible stage indicator, source citations, "not covered by your notes" state, retry on failure, short-answer low-data mode
- Quiz and mock-exam mode: timed option, marks, step-by-step working, wrong answers into weak-spot review; deterministic answer verification before display
- Study-pack import: polished flow with progress, dedupe, private-only guarantee

## Production freeze

Tag `study-freeze-2026-11-14` is NOT touched. No push, no merge, no production deploy.
