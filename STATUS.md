# STATUS — EasyTutor

Single source of truth for what is **live**, what is **stubbed**, and what is **blocked**.
Claims are verified against the code and gates this session, not trusted from history.

**Version:** 1.10.0 · **Expo SDK:** 57 · **React Native:** 0.86.3 · **React:** 19.2.3 ·
**TypeScript:** 6.0.3 · **Last verified:** 2026-11-17 (Wave 1 truth pass)
**Branch:** `fix/truth-pass` from `origin/main` @ `cae99d9` (unpushed by design)

> This file was rewritten in W1-0. Older per-sprint gate numbers in `sprints/` and
> `CHANGELOG.md` are historical records, **not** claims about current `HEAD`. Evidence for
> every number below is in `docs/evidence/wave1-*.md`.

---

## Current state at a glance

| Area | State | Evidence |
|---|---|---|
| Local gates (typecheck, lint, tests, boundaries, QA, perf budget) | GREEN — masking removed in W1-1; current suite 68 files / 380 tests | `docs/evidence/wave1-0-truth.md`, `wave1-1-ci-green.md`, `wave1-2-boundary.md` |
| GitHub Actions CI | **RED** on both Phase 1 and Phase 2 merge commits | `docs/evidence/wave1-0-truth.md`, `wave1-1-ci-green.md` |
| Phase 1 core loop (T0–T6) | **PARTIAL** — T0/T1/T2 done; T3–T6 partial (closed in W1-4) | `sprints/sprint_18_phase1_core_loop.md` + W1-2/W1-4 evidence |
| Phase 2 World-Class UI | **NOT ACCEPTED** — acceptance NOT MET; screens UNWIRED dead code | `sprints/sprint_19_phase2_design.md`, `docs/evidence/wave1-0-truth.md` |
| Design system | Implementation exists; `docs/design/DESIGN.md` still **Draft — awaiting approval** | `docs/design/DESIGN.md:3` |
| Ollama on web | **Opt-in (W1-2b DONE)** — empty default URL, no import-time fetch, reachability probe before any call | ADR-009, `wave1-2-boundary.md` |
| User-imported content | **Private (W1-2c DONE)** — embedding-less imports stored and stamped `USER_PRIVATE`, retrieved via ranked FTS RPC scoped by `auth.uid()` | ADR-009, `wave1-2-boundary.md` |
| Daily AI cap / RLS migrations | Present as SQL in `supabase/migrations/`; local `db reset` proof pending W1-3 | W1-3 evidence |

---

## Gates run this session (local)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ 0 errors — unmasked since W1-1 (`@axe-core/playwright` now declared; fresh-copy proof passes) |
| Lint | `npm run lint` | ✅ 0 errors / 190 warnings (gate enforced, no `\|\| true`) |
| Tests | `npm test` | ✅ 68 files / 380 tests (14.91 s, current `fix/truth-pass`) — quiz non-determinism fixed in W1-1; no reliance on local Ollama |
| Circular dependencies | `npm run lint:cycles` | ✅ 0 errors / 13 `no-orphans` warnings (328 modules, 1195 dependencies) |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations |
| QA runner | `node scripts/qa/qa_runner.js` | ✅ SUCCESS — 64 files / 370 tests |
| Web entry budget | `npm run perf:budget` | ✅ gzip 443,493 B / 450,000 B; raw 1,701,922 B / 1,750,000 B; 38 route chunks (min 30). **This gate ignores the per-route budget fields** — W1-6 fixes that. |
| Production web export | `npm run build` | `dist/` present; full rebuild in Wave 1 verification, not claimed here |
| `verify:spa` | `npm run verify:spa` | Prior session: 10/10 routes serve app shell; not re-run in this pass |

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
  ~729 KB transferred (target ≤ 300 KB). Raw Lighthouse JSON: `/tmp/wave1-lighthouse.json`,
  command recorded in `docs/evidence/wave1-6-budgets.md`.

---

## Phase 1 — Core loop — PARTIAL

Branch `phase1-core-loop` targeted: a learner on a 390 px phone can sign up, confirm, onboard,
import notes, ask a cited question, take a quiz, review weak spots, reload, deep-link and go
offline/online without losing data.

| Task | Honest state |
|---|---|
| T0 Build + SPA | DONE — `web.output: "single"`, SPA fallback, build exits 0 |
| T1 Profile read + owner map | DONE — `src/infrastructure/database/tableGovernance.ts` maps owner columns and portal scoping |
| T2 AI/Tutor/import boundary | **DONE (W1-2)** — hosted AI routed through `ai-proxy`; direct rail blocked at CI gate; Ollama opt-in with reachability probe; embedding-less imports stored and forced `USER_PRIVATE`; ranked FTS RPC with `auth.uid()` scoping; forward relabel migration for pre-existing user chunks; proxy health from the live model list. `docs/evidence/wave1-2-boundary.md`. |
| T3 Route smoke | PARTIAL — skips import failures, calls components as plain functions, no real error boundary. Closed in W1-4. |
| T4 One home / navigation | PARTIAL — `NavigationBar` is dead code; `CommandCenter` still renders outside the tabs. Closed in W1-4. |
| T5 Quiz cancel/offline/failure | PARTIAL — timeout/retry exist; no `AbortController` cancel, no provider-failure or offline test. Closed in W1-4. |
| T6 Auth E2E | PARTIAL — `lib/authRedirect.ts` is URL-tested only; no sign-up → email-confirmation → signed-in proof. Closed in W1-4. |

---

## Phase 2 — World-Class UI — NOT ACCEPTED

- Seven new screens (`screens/home/today.tsx`, `screens/tutor/session.tsx`,
  `screens/practice/index.tsx`, `screens/library/index.tsx`, `screens/progress/index.tsx`,
  `screens/setup/index.tsx`, plus the settings screen) are **unwired dead code**: no `app/`
  or `components/` import references them. They will not be wired, extended or restyled in
  Wave 1 — that requires a design phase driven by external mockups.
- `docs/design/DESIGN.md:3` still reads `Status: Draft — awaiting approval (Step 0)`.
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
- AI reliability wrapper (`lib/ai/reliability.ts`) provides timeout, retry, fallback and
  explicit source reporting; the disabled direct rail removal is done in W1-2.
- Offline-first stores (`store/`, `data/`), PWA service worker and SPA fallback are present.
- Migrations are present as SQL in `supabase/migrations/` (RLS hardening, governed cloud sync,
  atomic daily AI cap); applying them from zero is proven in W1-3, not here.

## Stubbed / partial

- Live-network round-trips (real cloud Supabase + physical Ollama endpoint) are not proven.
- Momentum/trend persistence cross-device round-trip is not proven.
- Phase 2 screens are dead code; commerce/payments remain archived (`archive/lib/commerce`).

## Blocked (outside the repo)

- Real Supabase project credentials and provider API keys (`.env*.local` is git-ignored by
  design) for staging/production verification.
- Physical-device verification (auth → chat → quiz → progress on Expo Go).
- Staging/production migration application and Supabase Auth URL settings — Daniel's steps in
  `docs/evidence/wave1-final.md`.

## Known gaps

- `any`-typed sites remain in `src/`/`lib/` (tracked backlog; no new `any` permitted).
- 190 ESLint `no-unused-vars` warnings; 13 dependency-cruiser `no-orphans` warnings.
- `src/infrastructure/evidence/index.ts` is unreferenced (spec decision needed to archive).
- Retrieval is honest (empty result, never a false match) when no chunk matches.
- `vitest` uses a 4-worker cap because one-worker-per-CPU oversubscribed shared machines;
  assertions are unchanged.
