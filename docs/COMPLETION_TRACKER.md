# EasyTutor — Completion Tracker (canonical)

> **Single source of truth for what remains to make EasyTutor ready for real-world use.**
> Created 2026-11-22 from a full read-only audit.
> Spec: `sprints/sprint_28_audit_and_completion_tracker.md`.
> Audit record with exact commands: `docs/evidence/2026-11-22-codebase-audit.md`.
>
> `STATUS.md` owns the live / stubbed / blocked picture **today**; this document owns the
> backlog, ordering and effort. If they disagree about present state, `STATUS.md` wins; if they
> disagree about what to do next, this document wins.
>
> **Superseded (historical — do not plan from these):**
> `docs/ROADMAP-TO-DONE.md`, `docs/product/MASTER_EXECUTION_TRACKER.md`,
> `docs/audit/TECHNICAL_DEBT.md`, `docs/verification/REMAINING_IMPLEMENTATION_PLAN.md`,
> `docs/audit/ROADMAP.md`.

---

## 0. The bar — what "real-world ready" means

These are the acceptance conditions. Each has a verification command or an named manual
proof. No task is DONE until its bar is demonstrated, not asserted.

| # | Condition | Verification | Now |
| --- | --- | --- | --- |
| R1 | Core loop works on the **real network**: sign-up → subject → cited tutor answer → quiz → progress → offline/online | `scripts/live-proof-checklist.md` 10/10 ticked with screenshots | **NOT MET** — 0/10 ticked; only fail-closed network proof exists (`docs/evidence/p0-live-proof-attempt-2026-11-19.md`) |
| R2 | No wired path serves fake data or claims protection it lacks (Constitution Art. I) | route-level real-path tests for practice/tutor/library | **NOT MET** — wired practice quiz is fake, wired tutor has no citations |
| R3 | Gates are truthful and deterministic | no always-green scripts; no scope-blind regex gates; clean repeated QA runs | **NOT MET** — 4 false gates proven, quiz test flakes at 5 s |
| R4 | Usable on Android phone, web phone (390 px), web desktop (≥1280 px) | device E2E + 3-viewport Playwright + screenshots | **NOT MET** — device E2E unproven; desktop effectively unsupported |
| R5 | Portrait lock does not block desktop; responsive shell exists | platform-scoped orientation + desktop layout test | **NOT MET** — global `portrait` lock (`app.json:6`) |
| R6 | Web performance: Lighthouse ≥ 80 or an explicit accepted decision | `npx lighthouse` mobile + desktop | **NOT MET** — `/` 49, `/login` 58; target deliberately kept ≥80 (Daniel, 2026-11-19) |
| R7 | Documentation is true | `STATUS.md`, this tracker, README agree with code | **PARTIAL** — three false/stale STATUS claims corrected in this change |
| R8 | Secrets never reach a client or a commit; guards cover all source dirs | `guard:secret-exposure`, `guard:public-env` incl. `screens/`, `dist/` | **PARTIAL** — guards skip `screens/`, `tests/`, `scripts/`, `dist/` |

---

## 1. Verified baseline (2026-11-22)

- Release `v1.15.0`, `main` @ `bd46cc4`, tag pushed and remote-verified. PRs #6–#12 merged.
- Gates on that commit: typecheck **0** errors; lint **0 errors / 158 warnings**; tests
  **86 files / 493 tests**; boundaries **0 violations**; AI boundary **PASS**; build **exit 0**;
  QA runner **all systems verified**; CI `build` + `Supabase Preview` **success**.
- **Codebase index:** `app/` 42 (35 thin lazy wrappers + 6 layouts + 1 inline login),
  `screens/` 40 (35 wired / **5 unwired**), `components/` 35, `lib/` 80, `store/` 9,
  `src/` 101, `data/` 4, `supabase/migrations/` 41, `tests/` 173, `scripts/` 27,
  `docs/` 255, `archive/` 52.
- **Duplication:** settings ×3 (`screens/settings.tsx`, `screens/settings/index.tsx`,
  `screens/tabs/settings.tsx`), library ×2, progress ×2, setup ×2.

---

## 2. Gap register

`Status`: **NOT DONE** / **BLOCKED** (external) / **PARTIAL**.
`Tier`: **1** = do first (80% of value) · **2** = cross-device & Phase 2 wiring · **3** = bulk debt/polish.
`Effort`: agent-sessions (one focused task incl. gates + docs ≈ half a day).

### Tier 1 — truth and core loop (highest leverage)

| ID | Gap | Evidence | Status | Owner | Effort |
| --- | --- | --- | --- | --- | --- |
| G-01 | **Wired** practice route served fake quiz (`What is the capital of ${topicName}?`, `Option A…D`); progress writes never called | was `screens/practice/index.tsx:40,96-101`; fixed in Sprint 29 | DONE (route/gate level; live device proof still blocked) | agent | 2–3 |
| G-02 | **Wired** tutor route passed `citations={[]}` and a hard-coded system prompt, and hid the composer on an empty thread | was `screens/tutor/session.tsx:85,206`; fixed in Sprint 29 | DONE (route/gate level; live device proof still blocked) | agent | 2–3 |
| G-03 | Locale gate only walked the `app/` import graph; 7 keys used by `screens/setup/index.tsx` were in no locale pack yet the gate passed | fixed in Sprint 30 (`tests/locales/keys.test.ts`, `src/locales/index.ts`, packs) | DONE (gate level) | agent | 0.5 |
| G-04 | `npm run audit:full` always exited 0 (no `set -e`, output swallowed, `madge` undeclared) | fixed in Sprint 30 (`scripts/full-audit.sh`) | DONE (gate level) | agent | 0.5 |
| G-05 | Secret/public-env guards skipped `screens/`, `tests/`, `scripts/`, `dist/`; no `gsk_`/`AIza`/`sk-` patterns | fixed in Sprint 30 (both guards, CI `guard:dist`) | DONE (gate level) | agent | 0.5–1 |
| G-06 | Quiz-flow test flakes at 5 s under 4 workers (12 s ×2 retry graph vs 5 s default timeout) | `vitest.config.js:12`; `hybridInferenceRouter.ts:127-141` | NOT DONE | agent | 1 |
| G-07 | Production `Database.getClient()` returns `globalThis.__MOCK_SUPABASE_CLIENT__` first; governance tests exercise that swap | `src/infrastructure/database/index.ts:20-22`; `tests/setup.ts:56` | NOT DONE | agent | 1–2 |
| G-08 | AI-boundary and architecture-boundary gates are regex/scope-limited (e.g. `screens/` not scanned) | `check-ai-boundary.mjs:31-50`; `validate_boundaries.js:5-46` | NOT DONE | agent | 1 |
| G-09 | Stale planning docs + STATUS facts (evidence module "unreferenced", 85/492, "all Phase 2 unwired") | five docs listed above; `STATUS.md:25,35,202` | PARTIAL | agent | 0.5 |

### Tier 1 — external blockers (Daniel; not agent tasks)

| ID | Gap | Evidence | Status | Owner | Effort |
| --- | --- | --- | --- | --- | --- |
| G-10 | No valid remote test user (repo fixture returns 400; no email in tracked files) | `p0-live-proof-attempt…md:50-54` | BLOCKED | Daniel | minutes |
| G-11 | `GROQ_API_KEY` not confirmed in Supabase Edge Function secrets (lookup by name only) | `supabase/functions/ai-proxy/index.ts:41` | BLOCKED | Daniel | minutes |
| G-12 | Vercel Authentication redirects browser navigation (302 → login); need session/Trusted Sources/bypass link | `p0-live-proof-attempt…md:25-33,55-57` | BLOCKED | Daniel | minutes |
| G-13 | Google OAuth round-trip manual (no provider credentials) | `STATUS.md:128` | BLOCKED | Daniel | — |
| G-14 | Staging/prod migration application + Supabase Auth URL settings | `STATUS.md:190-192` | BLOCKED | Daniel | — |

### Tier 2 — cross-device and Phase 2 wiring

| ID | Gap | Evidence | Status | Owner | Effort |
| --- | --- | --- | --- | --- | --- |
| G-15 | Desktop effectively unsupported: global portrait lock, only 80 px rail ≥768 px, no `maxWidth`/`grid`/`hover`, no desktop Lighthouse, Stitch desktop screens have no route | `app.json:6`; `app/(tabs)/_layout.tsx:12-46`; `ground-truth…md:141` | NOT DONE | agent | 3–4 |
| G-16 | Android E2E unproven; `android/` is git-ignored prebuild output; `expo-dev-client` needs a dev build | `.gitignore:41`; `eas.json:8,14`; `p0-live-proof…md:60-61` | NOT DONE | agent + Daniel | 2–3 |
| G-17 | Web-mobile perf fails: Lighthouse `/` 49, `/login` 58 (target ≥80); 732,396 B / 733,000 B (604 B headroom) | `ground-truth…md:170-183` | NOT DONE | decision + agent | 2–4 |
| G-18 | PWA installability unscored; `screenshots: []` | `public/manifest.json:26`; `sprint_19…md:91` | NOT DONE | agent | 0.5 |
| G-19 | A11y/touch: 191 `TouchableOpacity` vs 23 labels, no enforced 44 px target, one moderate landmark finding | audit §C | NOT DONE | agent | 1–2 |
| G-20 | Library screen unwired + 3 hard-coded docs, fake import, inert handlers | `screens/library/index.tsx:45-108,186,193` | NOT DONE | agent | 2 |
| G-21 | Setup screen unwired; selects subject/goal but persists only `setOnboardingComplete(true)` | `screens/setup/index.tsx:74-81` | NOT DONE | agent | 2 |
| G-22 | Progress screen unwired (real store data, artificial 300 ms skeleton delay) | `screens/progress/index.tsx` | NOT DONE | agent | 0.5 |
| G-23 | Duplicate screen families not consolidated (settings ×3, library ×2, progress ×2, setup ×2) | audit §A | NOT DONE | agent | 1 |

### Tier 3 — bulk debt and polish

| ID | Gap | Evidence | Status | Owner | Effort |
| --- | --- | --- | --- | --- | --- |
| G-24 | 115 `any` sites (123 occurrences, 59 files) | audit §B | NOT DONE | agent | 3–5 |
| G-25 | Hardcoded hex: 226 lines / 289 occurrences in 5 dirs; 587 lines incl. `screens/`. DESIGN.md rule 1 unenforced. STATUS's "233" is not reproducible | audit §B | NOT DONE | agent | 4–6 |
| G-26 | i18n: only 10/64 `<Text>` files import `t`; ≥476 literal child strings; 54 files have no `t()` | audit §B | NOT DONE | agent | 5–8 |
| G-27 | 85 debt markers: TODO 4, STUB 5, semantic PLACEHOLDER 29, MOCK 22, FAKE 2 | audit §B | NOT DONE | agent | 2–4 |
| G-28 | 158 ESLint warnings + 13 `no-orphans` warnings | `STATUS.md:197` | NOT DONE | agent | 1–2 |
| G-29 | sw/fr text expansion (20–30% longer) unassessed | `STATUS.md:82` | NOT DONE | Daniel review | — |
| G-30 | M-series StashMind integration (ADR-M1…M8) flags default OFF; H2–H6 steps span two repos | `ADR-M7-rollout-flags.md:7-13` | NOT DONE | separate program | out of scope |

---

## 3. Cross-device matrix

| Target | Current reality | Hardest blocker | Gaps | Proof required |
| --- | --- | --- | --- | --- |
| **Android phone** | Native project generated but untracked/ignored; EAS dev-client + APK preview configured; Expo Go docs still claim support | No end-to-end device run and no valid login | G-10, G-16 | `expo run:android` / EAS APK → install → 10-flow checklist with screenshots |
| **Web on phone (390 px)** | PWA manifest + service worker + SPA fallback present; 39 route chunks; works offline structurally | Lighthouse 49/58 vs ≥80; only 604 B of login-route headroom | G-03, G-17, G-18, G-19 | Lighthouse ≥80 or accepted decision; PWA install test; Playwright 390 px flows |
| **Web on desktop (≥1280 px)** | 80 px left rail above 768 px is the only viewport adaptation; portrait locked; no page container/grid/hover | Global portrait lock + no desktop layout; Stitch desktop screens have no routes | G-15, G-17, G-19 | Platform-scoped orientation; desktop layout test; desktop Lighthouse |

---

## 4. 80/20 plan and effort

**Compression logic:** the 20% that unlocks 80% of real-world readiness is *truth*, not polish.
A learner cannot be served by a product whose wired quiz is fake, whose tutor shows no
citations, whose gates can pass while the real path is broken, and which has never been run on
a device. Hex/i18n migration is real debt but does not change whether those flows work.

| Slice | Contents | Agent-sessions | Calendar (1 / 2 sessions per day) |
| --- | --- | --- | --- |
| **S1 — Truth (do first)** | G-01…G-09 | 8–11 | 1.5–2 weeks / ~1 week |
| **S2 — External unblock** | G-10…G-14 | 0 agent + 1 Daniel block | 1–2 h once inputs supplied |
| **S3 — Devices** | G-15…G-19, G-16 device proof | 8–12 | 2 weeks / 1 week |
| **S4 — Phase 2 wiring** | G-20…G-23 | 5–6 | 1 week / 3 days |
| **S5 — Bulk debt** | G-24…G-29 | 16–25 | 3–5 weeks / 2–3 weeks |

- **To a defensible real-world-ready bar (S1+S2+S3+S4): ~21–29 agent-sessions + 1 Daniel
  block ≈ 3–4 weeks at 1 session/day, 2–3 weeks at 2/day.** This satisfies R1–R5, R7, R8.
- **Full tech-debt clearance (add S5): ~37–54 sessions ≈ 6–10 weeks at 1/day.** R6 stays a
  decision-gated item regardless: the framework floor (287 KB gzip for a trivial
  expo-router app) makes Lighthouse ≥80 unrealistic without a platform/product decision.
- **These are estimates, not measurements.** Re-estimate after S1: fixing the wired fake
  paths may reveal further governed-layer work. No deadline is committed to Daniel.

---

## 5. Today's high-leverage tasks (next slice)

1. **Land this tracker** (Sprint 28) — done when the doc, evidence, superseded headers and
   STATUS/CHANGELOG/README updates are merged and released.
2. **G-01 + G-02 — real core loop on wired routes.** Port governed quiz generation +
   progress writes into `screens/practice/index.tsx` and governed retrieval, citations and
   source labelling into `screens/tutor/session.tsx`. Acceptance: a route-level test mounts
   the real route and fails on the fake version (negative proof first), then passes; no
   `any`, no loosened assertion, no raised timeout.
3. **G-03 + G-04 + G-05 — close the false gates** that let #2 ship unnoticed: scan all
   `screens/` for `t()` keys, make `audit:full` fail closed, widen secret-guard scope.
4. **G-09 — finish truth corrections** in STATUS and the superseded docs.
5. **Prepare Daniel's one-session live-proof pack** (G-10…G-12) so R1 can be proven without
   further discovery: exact inputs needed, no values in chat.

Order rationale: #2 is the core loop and the only place where a user is currently served
fabricated content; #3 prevents recurrence; #5 converts an external blocker into a short,
scheduled session. Desktop layout (#15) follows in S3 — it is important but downstream of a
truthful core loop.

---

## 6. Daniel's manual steps (blocking, not agent work)

1. Supply a valid remote test login in a temp file under `/tmp/opencode` (never in chat).
2. Set `GROQ_API_KEY` in Supabase Edge Function secrets; agent verifies only the lookup name
   at `supabase/functions/ai-proxy/index.ts:41`, never the value.
3. Grant browser access to the deployed URL (Vercel session, Trusted Sources rule, or a
   shareable protection-bypass link).
4. Provide Google OAuth credentials if the OAuth round-trip is in scope.
5. Apply migrations to staging/production and set Supabase Auth redirect URLs.
6. Decide explicitly on R6: keep Lighthouse ≥80 and accept NOT MET, or approve a revised
   target with a recorded ADR. No silent change.
7. Review sw/fr text expansion on the three longest screens (G-29).

---

## 7. Execution rules (non-negotiable)

- Spec first (`sprints/`), evidence with proof (`docs/evidence/`), STATUS + CHANGELOG in the
  same change; README moves when behaviour or offering changes.
- One concern per commit; hooks on; **never** `--no-verify`; push feature branches only; PRs
  to `main`; merges, tags and deploys only when green and authorized.
- Fail closed. No silent drops. Enforcement at the real boundary (Constitution Art. I–III).
- Tests mock only the network edge, never the unit under test; prove each fix fails without
  it; never weaken a test, raise a timeout or loosen an assertion to get green.
- Every number in reports comes from a command run in that session; unverified live claims
  are named as unverified.
