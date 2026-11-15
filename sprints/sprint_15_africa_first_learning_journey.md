# Sprint 15 — Africa-first learning platform: Phase 3 Learning Journey UI

Date: 2026-11-14.

Goal: Build the learning journey UI — setup wizard, home with weak spots, tutor session with citations/stage indicator/low-data mode, quiz/mock-exam with timed option + deterministic calc verification, and polished study-pack import. Interaction patterns inspired by Index 0 (visible staged tutoring loop, track/roadmap structure, guided setup wizard, mock exams instead of mock interviews, learner-owned content) — original design only; no code, prompts, copy, assets or methodology copied (Index 0 license forbids building a competing product from them).

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

## Phase 2 — Connected Backend (complete, from previous session)

**2.1 Auth/onboarding offline resilience** — `store/authStore.ts` + `app/onboarding.tsx`:
- Sign-in intent queueing; `syncPendingAuth()` on reconnect; module-load session check
- Pending intents persist in AsyncStorage; re-queue if sync still fails
- Onboarding completes locally when `governedWrite` fails

**2.2 Profile mock stats (M1)** — `screens/profile.tsx`: real `roadmaps.length`, computed `level`, xpTotal-derived focus time.

**2.3 Loading/empty/error states** — `screens/tabs/index.tsx`: `isLoading` + `ActivityIndicator`, `loadError` + retry button.

**2.4 AI tutor offline queue** — `store/studyStore.ts` + `screens/tabs/study.tsx`: `pendingAIRequests` queue, sync banner, auto-process on reconnect.

**2.5 Per-user private storage** — `tests/security/user-isolation.test.ts` (6 tests): governedWrite stamps `user_id`, `governedQuery` filters by `user_id`, cross-user isolation verified.

## Phase 3 — Learning Journey UI (complete, this session)

**3.1 Setup wizard** — `app/setup-wizard/index.tsx`:
- Multi-step wizard: country → level (secondary/TVET/university/self-learner) → curriculum track → goal & exam date → daily minutes → language/data mode → review → done
- Persists profile via `Database.governedWrite` (private scope, `user_id`/`portal_type` stamped)
- Pre-selects level from onboarding mode selection via URL param
- Applies preferences locally-first (lowDataMode, learningMode) then completes onboarding

**3.2 Home weak spots** — `screens/tabs/index.tsx`:
- 'Weak Spots to Review' section: wrong answers grouped by topic, ranked by frequency (top 3)
- Each weak spot links to AI tutor in 'Teach & Quiz' mode for review
- No dark patterns — helpful nudge only, no guilt language

**3.3 Tutor session** — `screens/tabs/study.tsx`:
- Visible stage indicator chip ('Stage: Socratic Guidance' / 'Direct Explanation' / 'Summary')
- Low-data mode: concise-answer instruction appended to system prompt when enabled
- Existing: citations `[Source ChN p.P]`, not-covered state, retry, offline queue (from prior sprints)

**3.4 Quiz/mock-exam** — `screens/tabs/quiz.tsx` + `lib/safeEval.ts` + `tests/lib/safeEval.test.ts`:
- Timed mode toggle + countdown timer (auto-submits current answer as wrong on timeout)
- Step-by-step working shown after answering (from AI `stepByStep` field)
- Deterministic calculation verification: `safeEval` verifies AI answers; mismatches hidden/flagged
- `lib/safeEval.ts`: zero-dependency recursive-descent parser (+, -, *, /, parens, unary minus); rejects variables/function calls/exponentiation/arbitrary URLs

**3.5 Study-pack import** — `screens/self_directed/index.tsx`:
- Prominent 'Private to you' guarantee shield (book text in user's PRIVATE scope only)
- Dedupe tracking: queries existing chunks before import, reports new vs existing vs failed
- Import result breakdown displayed inline
- Deterministic chunk ids = idempotent re-import (no duplicates)

## Deferred

**CAT mode (P2)**: exam-style calculation questions with marks + deterministic mathjs answer verification. `mathjs` could not be installed cleanly (`npm install` timed out leaving a corrupted partial install) and P2 is the lowest-priority task. The safe expression evaluator (`lib/safeEval.ts`) is in place as a dependency-free alternative.

## Evidence

- `sprints/sprint_15_africa_first_connected_backend.md` (Phase 2)
- `sprints/sprint_15_africa_first_learning_journey.md` (Phase 3, this file)
- `docs/evidence/sprint15-phase3-learning-journey.md` (literal gate output tails)
- `docs/evidence/sprint15-wiring-matrix.md`, `docs/evidence/sprint15-ux-audit.md`, `docs/evidence/screenshots/`

## Gates (all green on clean `npm ci` install, lockfile unchanged)

- `tsc --noEmit` 0 errors
- `npm run lint` 0 errors (131 pre-existing unused-var warnings tracked as backlog)
- `npm test` 287/287 sequential (57 test files)
- `validate_boundaries.js` 0 violations
- `check_public_env_allowlist.mjs` PASS (only `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` client-bundled)
- `qa_runner.js` SUCCESS
- `npm run build` (web export) PASS

## Risks for next session (Phase 4 — Africa-first extensibility)

- Curriculum packs as DATA (JSON schema + validator): country, level, board, subjects, topics, source status (OFFICIAL / COMMUNITY / DRAFT), version. Ship schema + ONE sample pack (Kenyan TVET technical subject, DRAFT) for Daniel's review.
- Local context: local currencies, SI units, locally familiar scenarios (matatu, boda boda, market traders) with setting to switch to global examples.
- Shared-device support: multiple local profiles with optional PIN.
- Data protection: consent/privacy screens in plain language, age-appropriate under-18 handling, data export/deletion. Flag that Kenya's DPA, Nigeria's NDPA, South Africa's POPIA and GDPR need review by a qualified person.
- Payments: design hooks only (pricing/plan interface). Do NOT integrate any payment provider.

## Production freeze

Tag `study-freeze-2026-11-14` is NOT touched. No push, no merge, no production deploy.
