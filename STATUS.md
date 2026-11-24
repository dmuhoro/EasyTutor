# STATUS — EasyTutor

Single source of truth for what is **live**, what is **stubbed**, and what is **blocked**.
Claims are verified against the code and gates this session, not trusted from history.

> **Backlog, ordering and effort live in [`docs/COMPLETION_TRACKER.md`](docs/COMPLETION_TRACKER.md)**,
> established by the full 2026-11-22 audit (`docs/evidence/2026-11-22-codebase-audit.md`).
> When this file disagrees with the tracker about present state, this file wins; when they
> disagree about what to do next, the tracker wins.

**Version:** 1.16.0 · **Expo SDK:** 57 · **React Native:** 0.86.3 · **React:** 19.2.3 ·
**TypeScript:** 6.0.3 · **Last verified:** 2026-11-24 (full gate run, secret-boundary verification
and attached Android device in `docs/evidence/2026-11-24-verification-and-secret-boundaries.md`;
release `v1.16.0`; Sprint 33 gate proof in `docs/evidence/2026-11-23-lighthouse-80.md`; Vercel
access and production browser Lighthouse attempt in
`docs/evidence/2026-11-23-vercel-access-and-live-proof.md`; earlier proof in
`docs/evidence/2026-11-22-codebase-audit.md` and `docs/evidence/phase2-settings-port.md`;
M1 proof in `docs/evidence/m1-final-gates.md`) ·
**Branch:** `main` after PRs #13–#17 merged via merge commits and the `v1.16.0` release commit.
Release tag `v1.16.0` pushed by agent authorization from Daniel. Supabase Preview check on
`1595d84` (where the RLS idempotency fix landed) and on `50e2329` is **success**.
Vercel CLI HTTP **and browser** access confirmed for `dmuhor01/easytutor` on 2026-11-23 using a
fresh short-lived OIDC token; a temporary, narrowly scoped Trusted Sources rule allowed production
browser access for measurement and was reverted immediately afterwards (`trustedSources: null`).
Merging to `main` triggers the automatic Vercel production deployment.
Production browser Lighthouse on this host was **below 80** (`/` 65→71, `/login` 74→66; TBT
520–760 ms) and is NOT claimed as a pass; live browser/device proof remains blocked — see
`docs/evidence/2026-11-23-vercel-access-and-live-proof.md` and
`docs/evidence/p0-live-proof-attempt-2026-11-19.md`.

> This file was rewritten in W1-0. Older per-sprint gate numbers in `sprints/` and
> `CHANGELOG.md` are historical records, **not** claims about current `HEAD`. Current M1 numbers
> are in `docs/evidence/m1-*.md`; older evidence is in `docs/evidence/wave1-*.md` and
> `docs/evidence/sprint21-stitch-ui.md`.

---

## Current state at a glance

| Area | State | Evidence |
|---|---|---|
| Local gates (typecheck, lint, tests, boundaries, AI boundary, build) | GREEN on `perf/lighthouse-80` — typecheck 0, lint 0 errors / 148 warnings, tests **92 files / 515 tests**, imports 423 files, boundaries 0 violations, AI boundary PASS, build exit 0, E2E smoke 9 passed, QA runner all systems verified, `audit:full` exit 0, source guard 450 files, bundle guard 495 files, entry/login budgets PASS. A pre-existing, load-dependent quiz-test timing flake is recorded historically, not hidden; no timeout, assertion or test was changed. | `docs/evidence/2026-11-23-lighthouse-80.md`, `docs/evidence/2026-11-22-truthful-gates.md` |
| E2 real-stack CI (Sprint 38) | **PARTIAL** — API port pinned to 54331, start/reset/build locally green (40 migrations), `real-stack` CI job added with trace upload. `npm run e2e:full` still fails 1/2 on the stale `Flagship Module` assertion (`tests/e2e/coreLoop.demo.spec.ts:193`), which contradicts the intentional post-onboarding redirect to Home. Not weakened; job fails closed. Docker-layer cache open. | `docs/evidence/E2-real-stack-ci.md`, `sprints/sprint_38_e2_real_stack_ci.md` |
| Citation excerpt-on-tap (P2 decision) | **DONE at component/gate level** — shared `ChatBubble` chips reveal the retrieved excerpt on tap and collapse on re-tap; chips with no excerpt are inert (no false affordance). Three new tests proven to fail without the fix. Study tab's existing excerpt sheet retained; the wired tutor session now passes real retrieved citations (Sprint 29). Live device E2E **NOT claimed**. | `docs/evidence/citation-excerpt-on-tap.md`, `docs/evidence/2026-11-22-core-loop-truth.md` |
| Answer-source label (Sprint 25) | **DONE at code/gate level** — every learner-facing AI answer shows the rail that actually answered (hosted / on-device / saved / placeholder / offline); cached, queued, offline and queued-retry answers carry their own truthful source; unknown or missing source fails closed to "source unavailable". Live cloud / real-device E2E **NOT claimed**. | `docs/evidence/sprint25-answer-source-label.md` |
| Single AI provider selector (M1 T2/T3) | **DONE** — one pure selector resolves hosted proxy → opt-in/reachable Ollama → offline; every live call path uses it, reports the rail actually used, and never switches rails after failure. Network-edge-only proofs cover JWT auth, bounded 429/5xx retries, offline queue, Ollama opt-in and breaker open/recover. | `docs/evidence/m1-t2-provider-truth.md`, `docs/evidence/m1-t3-boundary-proof.md`, ADR-010 |
| Governed retrieval + citation integrity (M1 T4/T5) | **DONE** — retrieval RPCs and chapter reads go through `src/infrastructure/database` with resolved portal and authenticated owner; two-user isolation and refused reads are proven. Answers credit only exact rendered markers from retrieved sources. | `docs/evidence/m1-t4-governed-retrieval.md`, `docs/evidence/m1-t5-citation-integrity.md` |
| Mathematics full-chain coverage (M1 T8) | **DONE** — 12-case full-chain test restored on the current authenticated store API alongside the untouched Sprint 23 evidence suite (23 tests across both files). | `docs/evidence/m1-t8-math-fullchain.md` |
| Authenticated Mathematics evidence flow (Sprint 23) | **DONE at store/route level** — `/math-journey` derives evidence from the signed-in learner and a real diagnostic answer, syncs through the ownership-checking Supabase writer, rejects duplicate submissions, rehydrates per learner, and renders the canonical projection with sync/error state. Live cloud / physical-device / browser E2E **NOT claimed**. | `docs/evidence/sprint23-math-authenticated-evidence.md` |
| W1-5 browser demo (390px, real local Supabase) | **PARTIAL** — `npm run e2e:full` 3/3 (sign-up, 7-step wizard + RLS profile row + reload, deep link). Cited answer / quiz / weak-spot / import / browser offline **NOT DONE** — see gaps | `docs/evidence/wave1-5-demo.md` |
| GitHub Actions CI | GREEN on main after PR #3 merge (fix/truth-pass → main) | `docs/evidence/sprint21-stitch-ui.md`, CI run 44390589166 |
| Phase 1 core loop (T0–T6) | **DONE at code/protocol level** — T0/T1/T2/T3/T4/T5/T6; Google OAuth round-trip still manual (no provider credentials) | `sprints/sprint_18_phase1_core_loop.md` + W1-2/W1-4 evidence |
| Phase 2 World-Class UI | **NOT ACCEPTED** — acceptance NOT MET, but the old "all seven screens unwired dead code" claim is **false**: 35/40 screens are wired. Settings was ported-and-flipped in Sprint 27; the wired practice and tutor deep links were brought to governed behaviour parity in Sprint 29 (G-01/G-02). Library, progress and setup remain unwired. | `docs/evidence/phase2-premise-audit.md`, `docs/evidence/2026-11-22-core-loop-truth.md`, `docs/COMPLETION_TRACKER.md` |
| Core-loop truth on wired routes (G-01/G-02) | **DONE at route/gate level** — `/practice` generates questions through the governed hook and writes score/wrong answers through the portal; `/tutor/session` retrieves private notes, cites only exact rendered markers, fails closed with an honest "not in notes" state, and always shows the composer. New route-level tests proven to fail against the pre-fix screens (3/3 and 2/2). Live browser/device proof **NOT claimed**. | `sprints/sprint_29_core_loop_truth.md`, `docs/evidence/2026-11-22-core-loop-truth.md` |
| Truthful gates (G-03/G-04/G-05) | **DONE at gate level** — locale coverage walks `app/` + `screens/` and all seven setup keys resolve in en/sw/fr; `audit:full` exits non-zero on any failed verification while still writing its report and treats outdated/npm-audit as explicit diagnostics; secret/public-env guards cover shipped source, tooling directories and the exported bundle in CI, with Groq/Google/OpenAI patterns. Every new gate was proven to reject what the old one missed. | `sprints/sprint_30_truthful_gates.md`, `docs/evidence/2026-11-22-truthful-gates.md` |
| Cross-device reality (G-15/G-16) | **DONE at shell/harness level only** — native portrait vs web `any` orientation, token-driven centred desktop shell (80 px rail + 1080 px content cap) with no 390 px regression, and a reproducible desktop Lighthouse baseline (initial `/` 40–46, `/login` 62–64; now superseded by Sprint 33). `qa:live-preflight` reported four BLOCKED prerequisites and 10 UNPROVEN flows; on 2026-11-24 a device is attached so `android-device` is READY and three remain BLOCKED. `--run-local` gates the credential-free build/guard/E2E/baseline checks. Physical-device and live-network proof **NOT claimed**. | `sprints/sprint_31_cross_device.md`, `docs/evidence/2026-11-22-cross-device.md`, `docs/evidence/live-proof-pack.md`, `docs/evidence/2026-11-24-verification-and-secret-boundaries.md` |
| Desktop Lighthouse ≥ 80 (G-17, desktop decision 2026-11-23) | **MET on the real local export** — three consecutive desktop-preset runs: `/` 89/92/91 and `/login` 91/92/91, TBT 180–220 ms. `npm run perf:lighthouse` is now fail-closed at 80 (observed rejecting both routes with `--min-score 100`, exit 1; default exits 0). Achieved by idle-scheduling non-critical startup/home sync work and not mounting the tab home screen for an unauthenticated visitor being redirected to `/login`. No budget, timeout or threshold changed. **Vercel browser production is NOT MET on this host** (`/` 65→71, `/login` 74→66; TBT 520–760 ms under load 3.58–6.20); this is recorded, not claimed as a pass. A 2026-11-24 local-export run also **failed closed** (`/` 72, `/login` 67; TBT 490/650 ms, load 5.83) — the gate rejects rather than silently passes; no threshold was changed. **Mobile preset remains NOT MET** (`/` 45, `/login` 46). | `sprints/sprint_33_lighthouse_80.md`, `docs/evidence/2026-11-23-lighthouse-80.md`, `docs/evidence/2026-11-23-vercel-access-and-live-proof.md`, `docs/evidence/2026-11-24-verification-and-secret-boundaries.md` |
| One-session live-proof pack (G-10…G-14) | **PACK DELIVERED — most live proof BLOCKED** — Vercel HTTP and browser access achieved with a fresh OIDC token plus a temporary, reverted Trusted Sources rule; production browser Lighthouse measured below target and not claimed as pass. Still blocked: Supabase CLI re-login/name-only `GROQ_API_KEY` check, remote test user, Google OAuth round-trip, staging/production migrations and Auth URL settings. The Android device `49IZ6DJ7SONNQOBE` (Redmi 25078RA3EA, Android 16) is now attached and `qa:live-preflight` reports `android-device` **READY**, but no app is installed and no live flow is proven. Preflight now marks three prerequisites BLOCKED and ten flows UNPROVEN; `--require-ready` exits 1. No secret value or live result claimed. | `docs/evidence/live-proof-pack.md`, `docs/evidence/2026-11-23-vercel-access-and-live-proof.md`, `docs/evidence/2026-11-24-verification-and-secret-boundaries.md`, `sprints/sprint_32_live_proof_pack.md` |
| Design system | Implementation exists; `docs/design/DESIGN.md` is **Approved — Stitch baseline (2026-11-17)** | `docs/design/DESIGN.md:3` |
| Ollama on web | **Opt-in (W1-2b DONE)** — empty default URL, no import-time fetch, reachability probe before any call | ADR-009, `wave1-2-boundary.md` |
| User-imported content | **Private (W1-2c DONE)** — embedding-less imports stored and stamped `USER_PRIVATE`, retrieved via ranked FTS RPC scoped by `auth.uid()` | ADR-009, `wave1-2-boundary.md` |
| Local DB / RLS / privacy proof | **DONE (W1-3)** — 104/104 RLS cases, 9/9 two-user RPC cases, 247/247 governance harness, post-hardening loop green. **`supabase db reset` from zero: DONE** — all 46 migrations apply cleanly from a fresh local stack (migration-repair follow-up completed: duplicate timestamps renumbered, missing `CREATE TABLE IF NOT EXISTS` added for `quiz_sessions`, `user_progress`, `cached_roadmaps`, `document_chunks`, `embedding`, `metadata`, `event_name`, `learning_mode`, `timestamp`, `user_id`, `curriculum_scope`; `vector` extension created before `hnsw` index; analytics disabled in config to avoid sidecar health-check failure). | `docs/evidence/wave1-3-local-supabase.md` |

---

## Gates run this session (local)

> Rows below marked with an older sprint are historical. For current `HEAD` (Sprint 33,
> `perf/lighthouse-80`), use `docs/evidence/2026-11-23-lighthouse-80.md`: typecheck 0 errors;
> lint 0 errors / 148 warnings; `npm test` 92 files / 515 tests; imports 423 files;
> boundaries 0 violations; AI boundary PASS; source guard 450 files; bundle guard 495 files;
> entry/login budgets PASS; desktop Lighthouse `/` 89–92 and `/login` 91–92 over 3 runs;
> `npm run build` exit 0; E2E smoke 9 passed; QA runner green; `npm run audit:full` exit 0.
> Prior Sprint 31 proof: `docs/evidence/2026-11-22-cross-device.md`.
> Prior Sprint 30 proof: `docs/evidence/2026-11-22-truthful-gates.md`.
> Prior Sprint 29 proof: `docs/evidence/2026-11-22-core-loop-truth.md`.
> Prior Sprint 25 proof: `docs/evidence/sprint25-answer-source-label.md`.
> M1 final gate proof (`docs/evidence/m1-final-gates.md`): 84 files / 484 tests, QA clean retry
> (one first-run 5 s timeout recorded), build 1,750 modules / 37 assets / 40 JS bundles.

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ 0 errors — unmasked since W1-1 (`@axe-core/playwright` now declared; fresh-copy proof passes) |
| Lint | `npm run lint` | Historical Sprint 23: 0 errors / 166 warnings. Current Sprint 31: 0 errors / 149 warnings (gate enforced, no `\|\| true`); none in changed files. |
| Tests | `npm test` | Historical Sprint 23: 81 files / 457 tests. M1: 84 files / 484 tests. Current Sprint 31: 91 files / 510 tests — all pass on a serial run (one parallel-run load flake recorded in the evidence). |
| Route smoke (W1-4/T3) | `npx vitest run -c vitest.config.js tests/smoke/routes.smoke.test.tsx` | ✅ 44/44 — all 42 remaining `app/` routes discovered from disk and their real lazy screens preloaded + mounted; 4 injected defects (broken import, non-component, child crash, crash inside a real screen) each rejected; deterministic empty-topic quiz regression passes |
| Tab nav gate (W1-4/T4) | `npx vitest run -c vitest.config.js tests/navigation/tabs-layout.test.tsx` | ✅ 6/6 — one `/` owner, six accessible tabs, keyboard/focus and selected state; failed 2/6 before the shadow route and dead components were removed |
| Quiz reliability (W1-4/T5) | `npx vitest run -c vitest.config.js tests/flows/quiz.reliability.test.tsx` | ✅ 7/7 — offline short-circuit (orchestrator never called), friendly provider error with bounded retries, 30 s deadline abort for a never-settling promise, cancel + unmount abort with no stale state, real-screen error/Retry UI; all 5 original gaps failed before the fix |
| Live auth flow (W1-4/T6) | `npm run test:auth-flow` | ✅ 4/4 — sign-up→signed-in, Mailpit confirmation link→`/update-password` with session, password reset→`updateUser`, OAuth return path; injected wrong-route defect rejected 2/4. Pinned to easytutor 54331/54325 (never `supabase status`) |
| Production web export | `npm run build` | Historical Sprint 23: ✅ exit 0 (1,752 modules, 41 bundles, 37 assets). Current M1: exit 0 — 1,750 modules, 40 JS bundles, 37 assets; `dist/` is git-ignored and the tree stayed clean. |
| Circular dependencies | `npm run lint:cycles` | ✅ 0 errors / 13 `no-orphans` warnings (324 modules, 1170 dependencies) |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | Historical Sprint 23: ✅ 0 violations. Current M1: 0 violations. |
| Local RLS matrix (W1-3) | self-checking `psql -f` harness on throwaway Supabase PG 17 | ✅ 104/104 cases; anon refused on 7/7 user tables, cross-user 0 rows |
| Two-user RPC privacy (W1-3) | real SQL on both retrieval RPCs | ✅ 9/9 cases; A↔B isolated, claim-less caller 0 rows |
| RLS governance harness | `bash scripts/security/run_rls_matrix_local.sh` | ✅ 247/247 pass, 0 fail, 0 blocked |
| `supabase db reset` from zero | `supabase db reset` on local stack (port 54322) | ✅ DONE — all 46 migrations apply cleanly from zero (migration duplicates renumbered; missing `CREATE TABLE IF NOT EXISTS` added for `quiz_sessions`/`user_progress`/`cached_roadmaps`/`document_chunks`; `vector` extension before `hnsw` index; analytics disabled in `config.toml` to avoid sidecar health-check failure) |
| QA runner | `node scripts/qa/qa_runner.js` | Historical Sprint 23: ✅ SUCCESS (81 files / 457 tests). Current M1: first run failed on one 5 s timeout (483/484); clean retry SUCCESS with 84 files / 484 tests — both runs in `docs/evidence/m1-final-gates.md`. |
| AI boundary (M1) | `node scripts/qa/check-ai-boundary.mjs` | `[AI BOUNDARY] PASS` — no direct rail call and empty default Ollama URL; the guard now also rejects direct Groq/Anthropic endpoints. |
| Secret exposure guard | `npm run guard:secret-exposure` | ✅ exit 0 — 274 client source files scanned; no service_role, Supabase secret key, Anthropic key, or service_role JWT in client code |
| Public env guard | `npm run guard:public-env` | ✅ exit 0 — 2 EXPO_PUBLIC_* names checked against allowlist; no unallowed client-bundled env names |
| Secret-pattern scan (working tree + origin/main..HEAD) | `rg` for `AQ\.`, `AIza`, `gsk_`, `sk-` patterns | ✅ 0 matches in EasyTutor source code and 0 matches in `origin/main..HEAD` commits. 2 pre-existing matches in `docs/security/` third-party Stripe JS audit artifacts (D-07, not EasyTutor secrets; excluded from `guard:secret-exposure` scan scope). `.env.local` exists (git-ignored, new Stitch key provided by Daniel via environment); only `.env.example` is tracked. |
| Web entry budget | `npm run perf:budget` | ✅ gzip 437,125 B / 450,000 B; raw 1,671,056 B / 1,750,000 B; 39 route chunks (min 30) — re-measured at final HEAD |
| Login-route JS transfer ratchet (W1-6) | `npm run perf:login-route` | ✅ 732,396 B transferred @ 390px (budget **revised** 733,000 B — raised by 2,157 B to accommodate two new Slice 3 routes: app/tutor/session.tsx and app/practice/index.tsx; may only decrease — 604 B headroom). Dead `loginRouteGzipBytes`/`loginRouteRawBytes` fields removed; injected breach rejected (exit 1); meta-test `tests/perf/perf-budget-fields.test.ts` 2/2 proves no unenforced field. |
| Framework floor (Epic 4) | trivial expo-router web app (built in temp dir, cleaned up) | ✅ Entry chunk: 1,091,204 B raw / 287,048 B gzip for a trivial one-route expo-router app (expo ~57.0.31, expo-router ~57.0.29, react-native 0.86.3, react 19.2.3). Framework alone consumes ~287 KB gzip — the ≤300 KB login-route target is unrealistic because the floor leaves ~13 KB for all app code. Daniel must approve a revised target. |
| Browser core-loop demo (W1-5) | `npm run e2e:full` | ❌ NOT RUN — available RAM 1,712 MiB (< 2 GiB threshold); browser context closed mid-signup ("Target page, context or browser has been closed") during `W1-5 Phase 1 DONE demo` sign-up test; 1 failed / 2 did not run of 3 demo tests. `e2e:smoke` (9/9) passes independently. |
| No-backend smoke (W1-5) | `npm run e2e:smoke` | ✅ 9/9 (53.2 s) — login render, deep links (high_school/university/self_directed), SPA fallback reload (200), confirmation path, PWA manifest/SW/icons at 390px mobile against local Supabase |
| Lighthouse desktop Performance (Sprint 33; user decision 2026-11-23) | `npm run perf:lighthouse` desktop preset on / and /login | ✅ MET on the real local export — three consecutive runs: `/` 89/92/91 and `/login` 91/92/91; TBT 180–220 ms. No budget, timeout or threshold changed. ❌ Vercel browser production on 2026-11-23 measured `/` 65→71, `/login` 74→66 (TBT 520–760 ms, load 3.58–6.20) and is **NOT** a pass. | `docs/evidence/2026-11-23-lighthouse-80.md`, `docs/evidence/2026-11-23-vercel-access-and-live-proof.md`, `sprints/sprint_33_lighthouse_80.md` |
| Lighthouse mobile Performance | `npx lighthouse` mobile 390px on / and /login | ❌ NOT MET — `/` 45, `/login` 46 on the final export (FCP 3.0 s, LCP 6.2 s, TBT 1.38–1.52 s). Historical mobile runs were 49/58. The 287 KB gzip framework floor and 732 KB login transfer remain binding; the 2026-11-19 decision to keep the target and mark NOT MET still stands for mobile. | `docs/evidence/2026-11-23-lighthouse-80.md`, `docs/evidence/ground-truth-2026-11-18.md §S8`, `docs/evidence/m1-followups-decisions.md` |
| axe accessibility scan | `@axe-core/playwright` at 390px and 1280px | ✅ 0 critical, 0 serious on / and /login at both viewports. 1 moderate each: "All page content should be contained by landmarks" (7 nodes). Root-layout `role="main"` not supported by React Native View — documented as known gap. | `scripts/axe-scan.mjs` (temp) |
| Hard-coded hex literals | `rg '#[0-9a-fA-F]{3,6}'` on app/, src/, components/, lib/, store/ | ❌ NOT MET — 233 hex literal occurrences found. DESIGN.md rule 1: "No screen may hardcode a hex." Design tokens exist in `src/design/tokens.ts` but 233 raw hex values bypass them. Migration to tokens is a significant refactoring task. | `docs/evidence/ground-truth-2026-11-18.md §S10` |
| Strings outside t() | Manual scan of app/, components/, screens/ | ❌ NOT MET — `t()` from `src/locales/index.ts` used in 10 screen files but many hardcoded English strings remain in Text components across app/, components/, screens/. i18n migration is a significant refactoring task. | `src/locales/index.ts` |
| DESIGN.md status | `docs/design/DESIGN.md:3` | ✅ APPROVED — "Status: Approved — Stitch baseline (2026-11-17). Replaces the Phase 2 draft palette." | `docs/design/DESIGN.md` |
| sw/fr text-expansion | Manual layout review | ⏳ NOT ASSESSED — French and Kiswahili typically 20-30% longer than English. Layouts use flexible sizing (flex-1, flex-row) but fixed containers may break. Requires Daniel review. | — |

## Gates RED (reproduced, not hidden)

- **CI, Phase 1 merge run `43927712086`:** tests failed —
  `tests/flows/quiz.wrongAnswers.test.ts` `expected 0 to be greater than or equal to 2`.
  Cause: retrieval silently falls back to an empty FTS table when Ollama is absent; the test
  only stubs the vector RPC (external-state nondeterminism). W1-1 fixes the cause.
- **CI, Phase 2 merge run `44050144294`:** typecheck failed —
  `TS2307: Cannot find module '@axe-core/playwright'` and `TS7006: Parameter 'v' implicitly
  has an 'any' type` at `tests/e2e/axe-a11y.test.ts`.
- **Fresh-clone reproduction this session:** `git clone @ cae99d9` → `npm ci` → `npm run
  typecheck` exits 2 with the exact two errors above. The local green is therefore not a
  valid CI signal.
- **Vitest `testTimeout`:** raised to `10000` ms in commit `ebe493c` to mask flakiness; the
  original config had no override (5 s default). **W1-1 has removed it**; no named test uses a
  raise.
- **W1-1 verification status:** a fresh copy of the working tree (no `node_modules`/`dist`/`.git`)
  passes all 12 CI steps in order, but the branch is **unpushed**, so GitHub Actions has not
  run on it. CI is only proven green locally until Daniel pushes. Evidence:
  `docs/evidence/wave1-1-ci-green.md`.
- **Phase 2 acceptance:** NOT MET. Lighthouse mobile Performance **36** in the Phase 2
  verification run; re-measured this session against the exported `dist/` at `/login`:
  **26** (FCP 9.7 s, LCP 20.4 s, TBT 3,980 ms, Speed Index 11.3 s, CLS 0) — target ≥ 80.
  axe 48/48 pass; Playwright visual baselines 69 pass / 27 fail of 96; login-route JS
  **730,799 B** transferred (target ≤ 300 KB) — now enforced as a decreasing ratchet by
  `npm run perf:login-route` (frozen ceiling 730,843 B, 44 B headroom); reaching 300 KB is an open investigation note (no work),
  not a claim. Raw Lighthouse JSON: `/tmp/wave1-lighthouse.json`, measurement and
  investigation note in `docs/evidence/wave1-6-budgets.md`.

---

## Phase 1 — Core loop — PARTIAL

Branch `phase1-core-loop` targeted: a learner on a 390 px phone can sign up, confirm, onboard,
import notes, ask a cited question, take a quiz, review weak spots, reload, deep-link and go
offline/online without losing data.

| Task | Honest state |
|---|---|
| T0 Build + SPA | DONE — `web.output: "single"`, SPA fallback, build exits 0 |
| T1 Profile read + owner map | DONE — `src/infrastructure/database/tableGovernance.ts` maps owner columns and portal scoping |
| T2 AI/Tutor/import boundary | **DONE (W1-2, superseded for routing by M1/ADR-010)** — hosted AI routed through `ai-proxy`; direct rail blocked at CI gate; Ollama opt-in with reachability probe; embedding-less imports stored and forced `USER_PRIVATE`; ranked FTS RPC with `auth.uid()` scoping; forward relabel migration for pre-existing user chunks; proxy health from the live model list. M1 adds one shared selector and truthful source reporting. `docs/evidence/wave1-2-boundary.md`, `docs/evidence/m1-t2-provider-truth.md`. |
| T3 Route smoke | **DONE (W1-4/T3)** — all 42 `app/` routes discovered from disk, imported without catch and their real lazy screens preloaded + mounted inside a real error boundary; any caught render error or skipped import fails the suite. Old wrapper-only false gate and wrapper-only proof replaced; 4 injected defects proven rejected, incl. a crash inside a real screen. `docs/evidence/wave1-4-t3-t6.md` |
| T4 One home / navigation | **DONE (W1-4/T4)** — `app/index.tsx` shadow route and `CommandCenter`/`NavigationBar` dead components deleted; `/` is owned solely by `app/(tabs)/index.tsx`; six-tab layout is the only nav with keyboard/focus + selected-state gates. `docs/evidence/wave1-4-t3-t6.md` |
| T5 Quiz cancel/offline/failure | **DONE (W1-4/T5)** — `withDeadline()` gives one 30 s wall-clock budget (was ~93 s with nested timeout×retry), real `AbortController` cancel on refresh/unmount threaded to the orchestrator and AI timeout, immediate offline short-circuit, friendly provider error + Retry. 7/7 real-path tests; all original gaps reproduced failing first. `docs/evidence/wave1-4-t3-t6.md` |
| T6 Auth E2E | **DONE at protocol level (W1-4/T6)** — real local GoTrue + Mailpit: sign-up→session, confirmation link→`/update-password` with usable token, reset→`updateUser`; `npm run test:auth-flow` 4/4. Google OAuth round-trip is **manual-only** (no credentials); local allow-list is not enforced — production URL settings for Daniel in `docs/evidence/wave1-4-t3-t6.md` §6 |

---

## Phase 2 — World-Class UI — NOT ACCEPTED

- Corrected 2026-11-19 (`docs/evidence/phase2-premise-audit.md`): the old claim that all
  seven Phase 2 screens were unwired dead code was **false**. `screens/tutor/session.tsx`
  and `screens/practice/index.tsx` are already wired as deep links from commit `4f25e28`;
  `screens/home/today.tsx` is archived at `archive/screens/home/today.tsx`.
- Sprint 27 flipped the **settings** route to the Phase 2 screen after porting the live
  Ollama config, per-role model-status detection and `PortalSwitcher`
  (`sprints/sprint_27_phase2_settings_port.md`, `docs/evidence/phase2-settings-port.md`).
- Still **NOT wired**: `screens/library/index.tsx` (3 hard-coded documents, fake import),
  `screens/progress/index.tsx` (real store data but unwired) and `screens/setup/index.tsx`
  (drops persisted setup fields). Flipping them as-is would regress M1-protected behaviour;
  they require the same port-then-flip treatment as settings.
- `docs/design/DESIGN.md:3` reads `Status: Approved — Stitch baseline (2026-11-17)`.
- Acceptance criteria: **NOT MET** (see table above). No Phase 2 evidence files existed before
  this pass; W1 evidence is now under `docs/evidence/wave1-*.md`.
- Locale files exist and screens use `t()`; no user-facing string migration claim is made
  beyond that.

---

## Live in code (structural — not end-to-end proven this session)

- Portal scoping: `portalFromMode()` resolves `high_school` / `university` / `knowledge_explorer`;
  governed reads/writes in `src/infrastructure/database/` stamp `user_id`/`portal_type`/
  `updated_at` and fail closed on an unresolved portal (Constitution Article III).
- Learning engines (mastery, performance, trends, spaced repetition, weakness prediction,
  learning plan, adaptive curriculum, knowledge graph, learning coach) compile and have unit
  coverage; cross-device round-trip against a live cloud instance is **not** proven.
- AI routing and reliability (`lib/ai/providerSelection.ts`, `providerResolver.ts`,
  `reliability.ts`) resolve one rail per request — hosted proxy → opt-in/reachable Ollama →
  offline — and report the rail actually used (`hosted_proxy`, `local_ollama`, `cache`,
  `placeholder`, `offline`). There is no silent cross-rail switch after failure (ADR-010,
  M1 T2/T3). The disabled direct rail removal is done in W1-2 and extended to direct
  Groq/Anthropic endpoints in M1.
- Offline-first stores (`store/`, `data/`), PWA service worker and SPA fallback are present.
- Migrations are present as SQL in `supabase/migrations/` (RLS hardening, governed cloud sync,
  atomic daily AI cap). The two new W1-2 migrations apply cleanly in order, and the coherent local
  DB (canonical `schema.sql` + migrations) is proven in W1-3. W1-5 adds a third forward migration,
  `20261117_setup_wizard_preferences.sql`, because the wired wizard wrote seven columns absent
  from `profiles` and silently degraded to local-only; it is idempotent and applied locally with
  `psql -v ON_ERROR_STOP=1`. **Applying the full chain from zero is DONE** — `supabase db reset`
  exits 0 on branch `fix/truth-pass` (migration duplicates renumbered; missing `CREATE TABLE IF NOT EXISTS`
  added where earlier migrations referenced tables created later; `vector` extension created before
  `hnsw` index; analytics disabled in `config.toml` to avoid sidecar health-check failure).

## Stubbed / partial

- Live-network round-trips (real hosted provider through the deployed proxy, cloud Supabase, and
  a physical Ollama endpoint) are not proven. M1's proofs mock only the network edge.
- Momentum/trend persistence cross-device round-trip is not proven.
- Phase 2 screens are dead code; commerce/payments remain archived (`archive/lib/commerce`).

## Blocked (outside the repo)

- Real Supabase project credentials and provider API keys (`.env*.local` is git-ignored by
  design) for staging/production verification.
- Physical-device verification (auth → chat → quiz → progress on Expo Go).
- Staging/production migration application — Daniel's steps in `docs/evidence/wave1-final.md`.
- Supabase Auth URL settings — Daniel's steps in `docs/evidence/wave1-4-t3-t6.md` §6 (Site URL,
  four redirect URLs, email confirmation ON in prod, Google callback).

## Known gaps

- `any`-typed sites remain in `src/`/`lib/` (tracked backlog; no new `any` permitted).
- 148 ESLint warnings (0 errors) on current `HEAD` (historically 158); 13 dependency-cruiser
  `no-orphans` warnings (historical).
- Mobile-preset Lighthouse remains NOT MET (`/` 45, `/login` 46). Desktop ≥80 was closed in
  Sprint 33 per the user's 2026-11-23 decision; the mobile preset was not relabelled or
  hidden. `docs/evidence/2026-11-23-lighthouse-80.md`.
- Local desktop Lighthouse is host-load-sensitive: at release time on a loaded host (load
  average ~2.7, user-owned Chrome renderer at ~83% CPU) the fail-closed gate returned `/` 70
  then 75 with TBT 440–540 ms on a byte-identical JS bundle; five earlier runs on that bundle
  were 89–92. Recorded, not hidden: `docs/evidence/2026-11-23-release-1.16.0.md`.
- One QA-runner 5 s timeout was observed on the first final gate run
  (`tests/flows/quiz.wrongAnswers.test.ts`, 483/484); an isolated run and a clean full retry
  passed. Root cause is not claimed; no timeout or assertion was changed. Recorded in
  `docs/evidence/m1-final-gates.md`.
- **Corrected 2026-11-22:** the earlier claim that `src/infrastructure/evidence/index.ts` is
  unreferenced was false — `store/mathJourneyStore.ts:5` imports `supabaseEvidenceWriter` from it.
  No archive decision is pending on that module.
- Retrieval is honest (empty result, never a false match) when no chunk matches.
- `vitest` uses a 4-worker cap because one-worker-per-CPU oversubscribed shared machines;
  assertions are unchanged.
