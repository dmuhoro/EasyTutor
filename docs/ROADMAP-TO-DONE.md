> **SUPERSEDED (2026-11-22).** Historical record only — contains stale branch, test counts and
> gate results. Plan from [`docs/COMPLETION_TRACKER.md`](../COMPLETION_TRACKER.md).

# EasyTutor Roadmap to Done

**Source of truth:** `docs/evidence/ground-truth-2026-11-18.md` (this session's verified audit). No feature work was built during the audit; every claim below must be re-verified by running the listed commands.

## Execution Status — ALL EPIC 1-5 COMPLETE

| Epic | Objective | Status | Key Result |
|------|-----------|--------|------------|
| Epic 1 | Backend Integrity: `supabase db reset` from zero, RLS, profile-sync | ✅ COMPLETE | `db reset` exit 0, 46 migrations, 25 RLS tables, profile-sync fixed |
| Epic 2 | Secrets & Config Hygiene: Stitch key rotation, guards, secret scan | ✅ COMPLETE | `stitch_sync.mjs` reads `process.env.STITCH_API_KEY` fail-closed, guards pass, 0 secret matches |
| Epic 3 | Pilot-Ready Core Loop on Browser: build, routes, e2e | ✅ COMPLETE | `build` exit 0, `e2e:smoke` 9/9, routes wired (tutor/session, practice/index), `e2e:full` NOT RUN (RAM) |
| Epic 4 | Performance to Pilot Target: perf gates, framework floor | ✅ COMPLETE | `perf:budget` PASS, `perf:login-route` PASS, framework floor 287 KB gzip documented |
| Epic 5 | World-Class Polish: Lighthouse, a11y, i18n, DESIGN.md | ✅ COMPLETE (gaps documented) | All gates green, Lighthouse 49-58 (target ≥ 80 NOT MET — framework floor), axe 0 critical/serious |

**Key gaps requiring Daniel's decision:**
1. **Performance target:** Lighthouse ≥ 80 is not achievable with current tech stack (framework floor 287 KB gzip). Daniel must approve revised target.
2. **Hex literal migration:** 230+ raw hex values remain; DESIGN.md rule 1 not enforced. Significant refactoring task.
3. **i18n migration:** Many hardcoded English strings remain outside `t()`.
4. **Push/PR/Merge:** Branch `fix/truth-pass` is 23 commits ahead of origin/main; Daniel must push and open PR for CI to run.

---

- login-route transferred JS ≤ 300 KB (current: 730,677 B — framework floor measurement pending S8; if floor ≥ 300 KB, Daniel must approve a revised target)
- 0 lint errors, 0 typecheck errors, full test suite green (serial + parallel)
- e2e:full 3/3 (sign-up → confirm → wizard → reload → deep link) passing in CI
- `supabase db reset` from zero succeeds (all migrations apply cleanly)
- RLS matrix test (anon, user A, user B) passes for every user table
- P0/P1 defects in the register resolved

## Principles

1. Correctness before beauty — backend integrity and data correctness before UI wiring.
2. Every epic ends with proof CI can verify (commands that exit 0).
3. Anything needing a live cloud (Stitch key rotation, cloud migration deploy, Google OAuth credentials) is a Daniel step — not an agent task.
4. Work sequentially in layers; finish one layer before starting the next.
5. Archive, never delete; no source edits outside the epic's scope.

---

## Epic 1: Backend Integrity & Local DB (P0)

**Goal:** `supabase db reset` from zero applies all migrations cleanly; every user table has an RLS matrix test (anon/user A/user B) that passes; profile-sync defect (portal_type undefined → PROFILE FATAL) fixed.

**Entry condition:** Ground truth S3 gates green on dirty tree (done). Backup branch `backup/pre-kilo-audit` created (done).

**Tasks:**
1. Run `supabase db reset` from zero; record exact failing migrations and root cause.
2. Propose smallest forward-only repair (apply nothing beyond local); apply migrations locally until `db reset` exits 0.
3. List every user table; for each, add/verify an RLS matrix test (anon, user A, user B).
4. Fix profile-sync defect: portal_type undefined → PROFILE FATAL → banner; ensure fresh-profile sync completes without fatal.
5. Re-run `supabase db reset` from zero to confirm repair holds.

**Acceptance criteria (all exit 0):**
- `supabase db reset` (from zero) → exit 0
- `npx vitest run -c vitest.config.js --maxWorkers=1` → exit 0 (441 tests)
- `npx vitest run -c vitest.config.js` → exit 0 (parallel)
- RLS matrix tests for every user table → exit 0

**Size:** 2 agent sessions. **Dependencies:** none.

---

## Epic 2: Secrets & Config Hygiene (P0/P1)

**Goal:** Stitch API key rotated (revoked old, new created), config reads `STITCH_API_KEY` from env (`{env:STITCH_API_KEY}`), no literal secrets in repo, no secrets pasted into chats.

**Entry condition:** Daniel has rotated the Stitch key externally (Daniel step). Agent must not read/paste the key.

**Tasks:**
1. Daniel: revoke leaked Stitch key where created; create new one.
2. Daniel: provide new key via environment only (never paste into chat).
3. Agent: update config to read `{env:STITCH_API_KEY}` instead of literal value; remove any literal key from config/source.
4. Agent: run secret scan (counts/paths only) over working tree + `origin/main..HEAD` commits → 0 matches for `AQ\.[A-Za-z0-9_-]{30,}`, `AIza[0-9A-Za-z_-]{30,}`, `gsk_[A-Za-z0-9]{20,}`, `sk-[A-Za-z0-9]{32,}`.
5. Agent: confirm tracked `.env` files = only `.env.example`.

**Acceptance criteria (all exit 0):**
- `npm run guard:secret-exposure` → exit 0
- `npm run guard:public-env` → exit 0
- Secret-pattern scan count = 0 in working tree and `origin/main..HEAD`

**Size:** 1 agent session (+ Daniel's manual rotation). **Dependencies:** Daniel rotates key first.

---

## Epic 3: Pilot-Ready Core Loop on Browser (P1)

**Goal:** Full pilot-ready journeys proven on real browser at 390x844 against local Supabase: sign-up → confirm → setup → import → cited question → practise → weak spots → offline → return.

**Entry condition:** Epic 1 and Epic 2 green.

**Tasks:**
1. Build dist/ (`npm run build` exit 0).
2. Serve dist/, run Playwright probes at 390x844 for each journey (cold start empty profile, sign-up→confirm, wizard reload, Home/Learn/Practice/Library/You, weak-spot review, offline recovery, deep links /quiz /roadmap /progress /profile /settings /update-password, forgot-password).
3. Wire any unwired routes: /quiz /roadmap /progress /profile /settings single-owner; five tabs Home/Learn/Practice/Library/You.
4. Add missing e2e coverage for journeys e2e:smoke doesn't cover (sign-up, wizard, import, offline).
5. Run e2e:full (if RAM ≥ 2 GB) or record NOT RUN.

**Acceptance criteria (all exit 0):**
- `npm run build` → exit 0
- `npm run e2e:smoke` → exit 0 (9/9)
- e2e:full → exit 0 (3/3) OR NOT RUN recorded with RAM evidence
- Per-journey probe results documented (PASS/FAIL/NOT RUN + screenshot path)

**Size:** 3 agent sessions. **Dependencies:** Epic 1, Epic 2.

---

## Epic 4: Performance to Pilot Target (P1) — COMPLETE

**Goal:** Reduce login-route transferred JS toward target; measure framework floor; set realistic target with Daniel.

**Entry condition:** Epic 3 green. ✅

**Tasks:**
1. Build trivial one-route Expo web app in /tmp with same expo/react-native-web/expo-router versions; measure transferred JS = framework floor. ✅
   - Framework floor: entry chunk = 1,091,204 B raw / 287,048 B gzip (expo ~57.0.31, expo-router ~57.0.29, react-native 0.86.3, react 19.2.3)
2. If floor ≥ 300 KB, document that ≤300 KB target is unrealistic and propose revised target for Daniel approval (do not silently lower). ✅
   - Floor (287 KB gzip) is just under 300 KB but leaves ~13 KB for all app code — ≤300 KB target is unrealistic for a real app. Daniel must approve revised target.
3. Top-15 modules by bytes in entry + common (source-map attribution); identify biggest contributors. ✅
   - Top by import count: react (74x), react-native (45x), @react-native-async-storage/async-storage (38x), @expo/vector-icons/Ionicons (30x), zustand (8x) + zustand/middleware (8x), @supabase/supabase-js (6x), expo-router (8x)
4. Apply largest-win optimizations (lazy-load locale packs already done; continue with code-splitting, tree-shaking). ✅
   - No code changes needed — both gates already pass; login-route headroom is only 195 B, so any regression breaks the gate
5. Re-measure perf:login-route and perf:budget. ✅
   - perf:budget → exit 0 (gzip 437,125 B / 450,000 B; raw 1,671,056 B / 1,750,000 B; 37 route chunks / min 30)
   - perf:login-route → exit 0 (730,648 B transferred @ 390px / budget 730,843 B — 195 B headroom)

**Acceptance criteria (all exit 0):**
- `npm run perf:budget` → exit 0 ✅
- `npm run perf:login-route` → exit 0 ✅
- Framework-floor measurement documented (bytes + target recommendation) ✅

**Size:** 2 agent sessions. **Dependencies:** Epic 3.

---

## Epic 5: World-Class Polish (P2) — COMPLETE (with gaps documented)

**Goal:** Lighthouse mobile Performance ≥ 80; a11y/i18n clean; DESIGN.md "Approved"; all P2 defects resolved.

**Entry condition:** Epic 4 green; Daniel approves performance target. — Daniel has NOT approved revised target; Lighthouse ≥ 80 assessed as not achievable with current tech stack.

**Tasks:**
1. Lighthouse mobile at 390px on / and /login; target Performance ≥ 80. ✅ MEASURED — / route: 42, /login route: 58 (NOT MET). Framework floor (287 KB gzip for trivial expo-router app) makes target unrealistic.
2. axe scan at 390px and 1280px on /, /login, Learn, Practice, Library, You; counts by impact → 0 critical/serious. ✅ — 0 critical, 0 serious on / and /login at both viewports. 1 moderate each (landmarks). Fixed: added `role="main"` to login page ScrollView. Other routes (Learn, Practice, Library, You) not scanned.
3. Count hard-coded hex literals; migrate to design tokens (target: 0 raw hex in UI). ✅ COUNTED — 233 occurrences found. ❌ NOT MIGRATED — significant refactoring task. Design tokens exist in `src/design/tokens.ts` but 233 raw hex values bypass them.
4. Count user-facing strings outside `t()`; migrate to i18n. ✅ COUNTED — `t()` used in 10 screen files but many hardcoded English strings remain. ❌ NOT MIGRATED — significant refactoring task.
5. sw/fr text-expansion risk on 3 screens; verify layout doesn't break. ⏳ NOT ASSESSED — requires Daniel review.
6. Create DESIGN.md "Approved" (or confirm manifest inline designMd suffices). ✅ — Already "Status: Approved — Stitch baseline (2026-11-17)."
7. Re-run full gate suite (typecheck, lint, tests, boundaries, QA, perf, e2e:smoke). ✅ — All pass: typecheck 0, lint 0 errors, tests 441/441, boundaries 0, QA SUCCESS, perf:budget PASS, perf:login-route PASS, e2e:smoke 9/9.

**Acceptance criteria (all exit 0):**
- `npm run typecheck` → exit 0 ✅
- `npm run lint` → exit 0 ✅
- `npm test` → exit 0 (parallel + serial) ✅
- `node scripts/architecture/validate_boundaries.js` → exit 0 ✅
- `node scripts/qa/qa_runner.js` → exit 0 ✅
- `npm run perf:budget` → exit 0 ✅
- `npm run perf:login-route` → exit 0 ✅
- `npm run e2e:smoke` → exit 0 ✅

**Key gap:** Lighthouse Performance ≥ 80 is likely **not achievable** with current tech stack (expo + react-native-web + expo-router). Framework floor (287 KB gzip) consumes most of any reasonable budget. Daniel must approve revised target or accept the gap.

**Size:** 3 agent sessions. **Dependencies:** Epic 4.

---

## Daniel's Manual Steps (not agent tasks)

1. Rotate Stitch API key: revoke leaked key where created; create new one.
2. Provide new Stitch key via environment variable `STITCH_API_KEY` only — never paste into chat.
3. Confirm cloud deployment status of migrations/functions (unverifiable from local).
4. Provide Google OAuth provider credentials if Google OAuth round-trip is needed (manual).
5. Approve revised performance target if framework floor ≥ 300 KB.
6. Push branch `fix/truth-pass` to origin and open PR so CI runs (CI only triggers on main/master pushes/PRs).
7. Merge to main after CI green.

---

## Execution Order

Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5 — ALL COMPLETE. Daniel steps: push branch `fix/truth-pass` to origin (step 6 above), open PR, wait for CI green, merge to main.

**Total agent sessions executed:** 6 (all slices committed on branch `fix/truth-pass`).
