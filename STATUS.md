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
| Local gates (typecheck, lint, tests, boundaries, QA, perf budget) | GREEN — masking removed in W1-1; current suite 71 files / 399 tests | `docs/evidence/wave1-0-truth.md`, `wave1-1-ci-green.md`, `wave1-2-boundary.md`, `wave1-3-local-supabase.md`, `wave1-4-t3-t6.md` |
| GitHub Actions CI | **RED** on both Phase 1 and Phase 2 merge commits | `docs/evidence/wave1-0-truth.md`, `wave1-1-ci-green.md` |
| Phase 1 core loop (T0–T6) | **PARTIAL** — T0/T1/T2/T3/T4 done; T5–T6 still partial | `sprints/sprint_18_phase1_core_loop.md` + W1-2/W1-4 evidence |
| Phase 2 World-Class UI | **NOT ACCEPTED** — acceptance NOT MET; screens UNWIRED dead code | `sprints/sprint_19_phase2_design.md`, `docs/evidence/wave1-0-truth.md` |
| Design system | Implementation exists; `docs/design/DESIGN.md` still **Draft — awaiting approval** | `docs/design/DESIGN.md:3` |
| Ollama on web | **Opt-in (W1-2b DONE)** — empty default URL, no import-time fetch, reachability probe before any call | ADR-009, `wave1-2-boundary.md` |
| User-imported content | **Private (W1-2c DONE)** — embedding-less imports stored and stamped `USER_PRIVATE`, retrieved via ranked FTS RPC scoped by `auth.uid()` | ADR-009, `wave1-2-boundary.md` |
| Local DB / RLS / privacy proof | **DONE (W1-3)** — 104/104 RLS cases, 9/9 two-user RPC cases, 247/247 governance harness, post-hardening loop green. **`supabase db reset` from zero: NOT DONE** — 7 pre-existing migrations assume `schema.sql` (migration-repair follow-up required) | `docs/evidence/wave1-3-local-supabase.md` |

---

## Gates run this session (local)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ 0 errors — unmasked since W1-1 (`@axe-core/playwright` now declared; fresh-copy proof passes) |
| Lint | `npm run lint` | ✅ 0 errors / 187 warnings (gate enforced, no `\|\| true`) |
| Tests | `npm test` | ✅ 71 files / 399 tests (current `fix/truth-pass`) — quiz non-determinism fixed in W1-1; every route mounted in a real error boundary in W1-4/T3; one-home nav gate in W1-4/T4; no reliance on local Ollama |
| Route smoke (W1-4/T3) | `npx vitest run -c vitest.config.js tests/smoke/routes.smoke.test.tsx` | ✅ 43/43 — all 42 remaining `app/` routes discovered from disk and mounted; 3 injected defects (broken import, non-component, child crash) each rejected |
| Tab nav gate (W1-4/T4) | `npx vitest run -c vitest.config.js tests/navigation/tabs-layout.test.tsx` | ✅ 6/6 — one `/` owner, six accessible tabs, keyboard/focus and selected state; failed 2/6 before the shadow route and dead components were removed |
| Production web export | `npm run build` | ✅ exit 0; `dist/` regenerated in W1-4/T4 (SPA fallback + PWA injection) |
| Circular dependencies | `npm run lint:cycles` | ✅ 0 errors / 13 `no-orphans` warnings (324 modules, 1170 dependencies) |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations |
| Local RLS matrix (W1-3) | self-checking `psql -f` harness on throwaway Supabase PG 17 | ✅ 104/104 cases; anon refused on 7/7 user tables, cross-user 0 rows |
| Two-user RPC privacy (W1-3) | real SQL on both retrieval RPCs | ✅ 9/9 cases; A↔B isolated, claim-less caller 0 rows |
| RLS governance harness | `bash scripts/security/run_rls_matrix_local.sh` | ✅ 247/247 pass, 0 fail, 0 blocked |
| `supabase db reset` from zero | isolated `supabase start` in `/tmp/opencode/w1-dbtest` | ❌ NOT DONE — fails at `20260505_progress_system.sql` (7 pre-existing migrations broken). Local proof bootstrapped with `schema.sql` instead. |
| QA runner | `node scripts/qa/qa_runner.js` | ✅ SUCCESS — 64 files / 370 tests |
| Web entry budget | `npm run perf:budget` | ✅ gzip 443,090 B / 450,000 B; raw 1,700,524 B / 1,750,000 B; 37 route chunks (min 30). **This gate ignores the per-route budget fields** — W1-6 fixes that. |
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
| T3 Route smoke | **DONE (W1-4/T3)** — all 43 `app/` routes discovered from disk, imported without catch and mounted inside a real error boundary; any caught render error or skipped import fails the suite. Old false gate removed; 3 injected defects proven rejected. `docs/evidence/wave1-4-t3-t6.md` |
| T4 One home / navigation | **DONE (W1-4/T4)** — `app/index.tsx` shadow route and `CommandCenter`/`NavigationBar` dead components deleted; `/` is owned solely by `app/(tabs)/index.tsx`; six-tab layout is the only nav with keyboard/focus + selected-state gates. `docs/evidence/wave1-4-t3-t6.md` |
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
  atomic daily AI cap). The two new W1-2 migrations apply cleanly in order, and the coherent local
  DB (canonical `schema.sql` + migrations) is proven in W1-3. **Applying the full chain from zero
  is NOT DONE** — `supabase db reset` fails on 7 pre-existing migrations (details and the required
  migration-repair follow-up in `docs/evidence/wave1-3-local-supabase.md §1, §7`).

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
- 187 ESLint `no-unused-vars` warnings; 13 dependency-cruiser `no-orphans` warnings.
- `src/infrastructure/evidence/index.ts` is unreferenced (spec decision needed to archive).
- Retrieval is honest (empty result, never a false match) when no chunk matches.
- `vitest` uses a 4-worker cap because one-worker-per-CPU oversubscribed shared machines;
  assertions are unchanged.
