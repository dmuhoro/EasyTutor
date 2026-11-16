# Sprint 18 — Phase 1: Core Loop (EasyTutor)

Date: 2026-11-16. Branch: `phase1-core-loop` from `origin/main` @ `2d7e113`.

Goal: a new user on a 390px phone can sign up, confirm, onboard (saved), import notes, ask a question and get a cited answer, take a quiz, review weak spots, reload, open a deep link, and go offline and back without losing data.

Spec: `~/easytutor-walkthrough/REPORT.md` (independent audit with `file:line` evidence against tag `study-freeze-2026-11-14`). Every finding is reproduced on current HEAD before it is fixed; anything that no longer reproduces is shown passing and left alone.

Rules for this sprint:
- One commit per task, never `--no-verify`.
- No push, merge, tag, production deploy, `vercel` CLI, or Supabase dashboard/production access.
- Every number in the report comes from a command run in the session.
- Migrations are immutable; schema changes are new forward-only migrations tested on local Supabase only.
- User-imported notes and book text stay private per user.

## T0 — Ground truth and a build that ships

**Reproduced.** `git log origin/main..HEAD` → 0 commits. Gates on clean HEAD: typecheck 48s exit 0; lint 0 errors / 152 warnings; tests 60 files / 313 tests (serial); `lint:cycles` 0 errors / 13 warnings; `guard:secrets` PASS; `perf:budget` PASS (440,638 B gzip / 450,000 B, 36 route chunks). `npm run build` → **exit 7**, `ReferenceError: window is not defined` while prerendering a zustand-persist write (`AsyncStorage.setItem`) in Node.

**Fix.**
- `app.json`: `expo.web.output` `static` → `single`. The app is a client-only SPA; prerendering bought nothing and broke the build.
- `vercel.json`: catch-all rewrite → `/index.html`.
- `scripts/serve-dist-spa.mjs` (`npm run verify:spa`, `npm run serve:dist`): serves `dist/` the way the platform does and asserts `/`, `/login`, `/study`, `/update-password`, `/quiz`, `/profile`, `/settings` return the app shell while a missing chunk still 404s. A missing chunk must never be answered with HTML — that boots to a blank page with a JSON parse error.
- `vitest.config.js`: `maxWorkers: 4`. The default one-worker-per-CPU pool oversubscribed this 8-core box (load average ~13 with editor/browser running); three flow tests that cold-load the store → learning-port graph (~2.3s each alone) hit the 5s timeout only under 8-way contention. Assertions and timeouts are unchanged.

**Evidence.** `npm run build` exit 0 in 4m36s. `npm run verify:spa` 10/10 PASS. `perf:budget` PASS 440,638 B gzip. `npm test` 313/313 in hook mode (64s).

## T1 — Profiles read and one owner map

**Reproduced.** `Database.governedQuery({ table: 'profiles', userId })` emitted `["portal_type","user_id"]` (`tests/infrastructure/repro…` run captured `[REPRO] profiles query filters -> ["portal_type","user_id"]`) and returned `data: null` against a seeded profile. `profiles` is keyed by `id` and its row was written with `portal_type: 'high_school'`; in production the `user_id` filter is PostgREST `42703`, `app/_layout.tsx:88` retries, throws, and sets “Profile sync failed. Using offline defaults.” (`app/_layout.tsx:128`).

Second defect found while reproducing: `profiles` *does* have `portal_type`, but a profile is one row per user. Filtering it by the currently selected portal hides the row the moment a learner switches mode, and the “missing profile” branch re-creates it with `onboarding_complete: false` (`app/_layout.tsx:102-107`). Onboarding would reset on every reload after a mode switch.

Third: `buildPortalScopedQuery` always filtered `portal_type`, but `subject_mastery`, `learning_plans`, `knowledge_paths` and `knowledge_nodes` have no such column (`mastery.ts:57`, `learningPlanEngine.ts:159`, `knowledgeGraphEngine.ts:55`).

**Fix.**
- `src/infrastructure/database/tableGovernance.ts`: one map per table — `ownerColumn` (`id` / `user_id` / `null`) and `portalScoped`. It mirrors the owner array in `supabase/migrations/20261104_rls_hardening.sql` (24 tables) plus `knowledge_chunks` and the shared `knowledge_nodes`.
- Reads filter the mapped owner column and filter `portal_type` only when the table is portal-scoped. An unregistered table with a `userId` throws — no silent unscoped read.
- Writes stamp the mapped owner column and stamp `portal_type` only when portal-scoped; a table with no owner column throws.
- `profiles` is `portalScoped: false`: one row per user, portal is informational.
- `tests/infrastructure/tableGovernance.test.ts`: owner map vs the RLS migration, read filters for every table, portal-filter behaviour for every table, write stamps for every table, and profile persistence across a portal switch + reload.

**Evidence.** New tests 6/6 pass; full suite 61 files / 319 tests; typecheck 0 errors.

## T2–T6

Recorded as they land.
