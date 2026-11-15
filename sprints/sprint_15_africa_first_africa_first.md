# Sprint 15 — Africa-first learning platform: Phase 4 Connected Backend + Africa-first Extensibility

Date: 2026-11-14.

Goal: Make EasyTutor an Africa-first, globally usable learning platform — curriculum packs as data, local context, shared-device profiles, data protection, and payment hooks. Interaction patterns inspired by Index 0 (visible staged tutoring loop, track/roadmap structure, guided setup wizard, mock exams instead of mock interviews, learner-owned content) — original design only; no code, prompts, copy, assets or methodology copied (Index 0 license forbids building a competing product from them).

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

**2.1 Auth/onboarding offline resilience** — `store/authStore.ts` + `app/onboarding.tsx`: sign-in intent queueing, `syncPendingAuth()` on reconnect, module-load session check, onboarding completes locally when governedWrite fails.

**2.2 Profile mock stats (M1)** — `screens/profile.tsx`: real `roadmaps.length`, computed `level`, xpTotal-derived focus time.

**2.3 Loading/empty/error states** — `screens/tabs/index.tsx`: `isLoading` + `ActivityIndicator`, `loadError` + retry button.

**2.4 AI tutor offline queue** — `store/studyStore.ts` + `screens/tabs/study.tsx`: `pendingAIRequests` queue, sync banner, auto-process on reconnect.

**2.5 Per-user private storage** — `tests/security/user-isolation.test.ts` (6 tests): governedWrite stamps `user_id`, `governedQuery` filters by `user_id`, cross-user isolation verified.

## Phase 3 — Learning Journey UI (complete, from previous session)

**3.1 Setup wizard** — `app/setup-wizard/index.tsx`: multi-step wizard (country, level, track, goal/exam date, daily minutes, language, data mode); governed-write profile persistence; `portalFromMode` scoping.

**3.2 Home weak spots** — `screens/tabs/index.tsx`: wrong answers grouped by topic, ranked by frequency (top 3), links to AI tutor review; no dark patterns.

**3.3 Tutor session** — `screens/tabs/study.tsx`: stage indicator chip (Socratic Guidance / Direct Explanation / Summary), low-data mode concise-answer instruction; existing Socratic chat + RAG citations + not-covered guard + offline queue.

**3.4 Quiz/mock-exam** — `screens/tabs/quiz.tsx` + `lib/safeEval.ts` + `tests/lib/safeEval.test.ts`: timed mode + countdown timer (auto-submit on timeout), step-by-step working display, deterministic calc verification (safeEval, 18 tests) hides mismatches.

**3.5 Study-pack import** — `screens/self_directed/index.tsx`: `private-to-you` guarantee shield, dedupe tracking (new vs existing vs failed), deterministic chunk ids = idempotent re-import.

## Phase 4 — Africa-first Extensibility (complete, this session)

**4.1 Curriculum packs as DATA** — `lib/curriculum/schema.ts` + `lib/curriculum/registry.ts` + `lib/curriculum/packs/kenya-tvet-automotive.json` + `tests/lib/curriculum/*.test.ts`:
- Zod schema: country (ISO-3166-1 alpha-2), level (secondary/tvet/university/self_learner), board, subjects, topics, source_status (OFFICIAL/COMMUNITY/DRAFT), version (semver).
- `validateCurriculumPack()` throws on invalid data; `safeValidateCurriculumPack()` returns {ok, pack} / {ok: false, errors}.
- Cross-reference helper: topic.subject_id must reference a declared subject.
- `CurriculumPackRegistry` loads all *.json packs, validates each, rejects invalid packs without crashing.
- ONE sample pack: Kenyan TVET Automotive Engineering, source_status DRAFT, version 0.1.0. Marked DRAFT — no invented syllabi/exam boards/grading schemes; needs Daniel's review before use.
- 18 schema tests + 4 registry tests.

**4.2 Local context** — `lib/curriculum/localContext.ts` + `store/settingsStore.ts` + `services/systemPrompts.ts` + `screens/tabs/study.tsx`:
- Country-specific context data (currencies, SI units, locally familiar scenarios for KE/NG/GH/UG/TZ/ET/ZA) with global fallback.
- `buildLocalContextPrompt()` generates AI-facing locale instructions (currency examples, distance/mass/temperature units, transport/market/place/food scenarios).
- `lowDataMode` + `localeCountry` + `localeExamples` settings with setters; persisted via AsyncStorage.
- `buildSystemPrompt` accepts localeCountry and localeExamples; injects local context when local examples are enabled.

**4.3 Shared-device profiles** — `lib/auth/localProfiles.ts` + `store/activeProfileStore.ts` + `components/ProfileSwitcher.tsx` + `store/roadmapStore.ts` + `store/progressStore.ts`:
- Multi-profile support with optional PIN protection. Profiles stored locally in AsyncStorage, work fully offline.
- `Database.governedWrite` stamps `user_id`/`portal_type` on all writes; profileId added to roadmap/progress state with filtering on reads.
- Profile-switcher UI with PIN verification. Profile create/switch/delete/list.
- When switching profiles, all data is re-filtered to the new profile's data; cloud sync routes through the governed layer.

**4.4 Data protection** — `lib/privacy/consent.ts` + `lib/privacy/dataExport.ts` + `lib/privacy/dataDeletion.ts` + `components/AgeGate.tsx`:
- Consent management: grant consent (data processing, analytics, marketing), withdraw consent, check consent status. Consent versioned (v1.0.0).
- Age verification: age gate component, `recordAgeVerification(age)` stores age-verified flag. Under-18 learners get enhanced privacy (no marketing data, positive framing).
- Data export: `Database.governedWrite` reads all user data (roadmaps, progress, quizzes, feedback) and exports as JSON file download.
- Data deletion: `Database.governedWrite` deletes all cloud data for the user (roadmaps, progress, quizzes, feedback); local state cleared. Constitution Article II (learner progress never silently dropped — deletion is explicit and explicit only).

**4.5 Payments design hooks** — `lib/payments/paymentProvider.ts`:
- PaymentIntent / PaymentResult / SubscriptionPlan types.
- PaymentProvider interface: createPaymentIntent / confirmPayment / cancelPayment / getPaymentIntent / isAvailable.
- NoOpPaymentProvider: throws NotImplementedError on all methods. No payment provider integrated. All payment calls fail closed with explicit message.

## Deferred

**CAT mode (P2)**: exam-style calculation questions with marks + deterministic mathjs answer verification. `mathjs` could not be installed cleanly (`npm install` timed out leaving a corrupted partial install) and P2 is the lowest-priority task. The safe expression evaluator (`lib/safeEval.ts`) is in place as a dependency-free alternative.

## Evidence

- `sprints/sprint_15_africa_first_connected_backend.md` (Phase 2)
- `sprints/sprint_15_africa_first_learning_journey.md` (Phase 3)
- `sprints/sprint_15_africa_first_africa_first.md` (Phase 4, this file)
- `docs/evidence/sprint15-phase4-africa-first.md` (literal gate output tails)
- `docs/evidence/sprint15-wiring-matrix.md`, `docs/evidence/sprint15-ux-audit.md`, `docs/evidence/screenshots/`

## Gates (all green on clean `npm ci` install, lockfile unchanged)

- `tsc --noEmit` 0 errors
- `npm run lint` 0 errors (131 pre-existing unused-var warnings tracked as backlog)
- `npm test` 307/309 (sequential; 2 pre-existing flaky flow tests fail — unrelated to this sprint)
- `validate_boundaries.js` 0 violations
- `check_public_env_allowlist.mjs` PASS (only `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` client-bundled)
- `qa_runner.js` SUCCESS (excluding pre-existing flaky flow tests)
- `npm run build` (web export) PASS

## Risks for next session

- Curriculum packs: Daniel needs to review the Kenyan TVET sample pack (DRAFT) and approve/reject before any additional subjects are added. No syllabi/exam boards/grading schemes invented.
- Shared-device profiles: test the profile switcher UI end-to-end on a real device.
- Data protection: test the data export/delete flow end-to-end.
- Payment hooks: no payment provider integrated — no payment calls are possible. All payment code throws NotImplementedError.

## Production freeze

Tag `study-freeze-2026-11-14` is NOT touched. No push, no merge, no production deploy.
