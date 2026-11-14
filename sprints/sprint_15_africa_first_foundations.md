# Sprint 15 — Africa-first learning platform

Date: 2026-11-14.

Goal: make EasyTutor a modern, Africa-first, globally usable learning platform — a Socratic tutor grounded in the learner's own materials, with tracks, roadmaps and mock exams. Interaction patterns inspired by Index 0 (visible staged tutoring loop, track/roadmap structure, guided setup wizard, mock exams instead of mock interviews, learner-owned content) — original design only; no code, prompts, copy, assets or methodology copied (Index 0 license forbids building a competing product from them).

## Phase 0 — Audit (complete)

**0.1 Clean install + gates** — `rm -rf node_modules && npm ci`; lockfile unchanged (`1c3bed13...`), tree clean. All gates green: typecheck 0, lint 0 errors, 263/263 tests (sequential), boundary audit 0 violations, public-env guard PASS (only `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` client-bundled; Groq key removed), QA runner SUCCESS, web export PASS.

**0.2 Wiring matrix** — `docs/evidence/sprint15-wiring-matrix.md`: all 34 routes classified BACKEND / LOCAL-ONLY / MOCK with loading/empty/error/offline status; mock/hard-coded inventory (M1–M7); handling-quality gaps; recommended Phase 2 replacement order.

**0.3 UX audit** — `docs/evidence/sprint15-ux-audit.md` + 16 screenshots (`docs/evidence/screenshots/`): 8 routes × 2 widths (390px mobile / 1280px desktop). Problems vs clarity of next action, visual hierarchy, 44px tap target, contrast, text density, perceived speed. Top-10 fixes ranked (onboarding 2500ms forced delay, mock profile stats, reset-without-confirm, mode-toggle tap targets, version drift, duplicate button, missing empty/error/loading states, login primary CTA, roadmap checkboxes, Explore entry points).

## Phase 1 — Foundations (complete)

**1.1 Design tokens** — `src/design/tokens.ts` (MOTION token set + MotionMode type; durations collapse to zero under `prefers-reduced-motion`) + `src/design/reducedMotion.ts` (`useReducedMotion()`/`motionDuration()`). Light/dark themes already in `lib/theme.ts`.

**1.2 App shell** — `app/_layout.tsx` already provides a single Expo Router navigation stack working on phone + desktop, with auth→onboarding→command-center gating and an offline banner.

**1.3 Shared states** — `components/ui/EmptyState.tsx`: EmptyState, ErrorState, LoadingState using tokens + 44px tap targets.

**1.4 i18n scaffolding** — `src/locales/en.json` (complete English), `sw.json`/`fr.json` (DRAFT, machine-translated, flagged via `_meta`), `src/locales/index.tsx` (`TranslationProvider` + `useTranslation()` + `t()` with `{{param}}` interpolation; zero new dependencies).

**1.5 Low-data mode** — `store/settingsStore.ts` (`lowDataMode` + per-session `dataUseKB`), `lib/useConnectionStatus.ts` (NetInfo auto-suggest below 0.5 Mbps), `components/LowDataBanner.tsx` (visible data-use estimate + toggle).

**Deferred:** CAT mode (P2) — exam-style calculation questions with deterministic mathjs verification; `mathjs` could not be installed cleanly (`npm install` timed out leaving a corrupted partial install). Revisit when mathjs installs cleanly.

**Evidence:** `sprints/sprint_15_africa_first_foundations.md` (this file), `docs/evidence/sprint15-wiring-matrix.md`, `docs/evidence/sprint15-ux-audit.md`, `docs/evidence/screenshots/`.

**Gates:** typecheck 0, lint 0 errors, 263/263 tests, boundary 0 violations, public-env guard PASS, QA SUCCESS, web export PASS.

**Risks for next session (Phase 2 — connect frontend to backend):**
- Replace every MOCK/HARD-CODED and LOCAL-ONLY item from the wiring matrix that should be persisted, using only the existing governed data layer (no second access path).
- Per-user private storage must be proven by tests: user A cannot read user B's content, progress or study packs.
- Offline-first core loop: queue writes, sync on reconnect, show sync state, resolve conflicts deterministically.
