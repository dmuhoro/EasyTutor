# Sprint 17 — Trust, Reach & Resilience (EasyTutor)

Date: 2026-11-16.

Goal: Bring EasyTutor closer to real-world usability and trustworthiness — fix the RLS grant excess that exposed all user data to the `anon` role, make deep links and PWA launch work, fix the retrieval scope mismatch, remove the local-Ollama dependency from the web path, add a Forgot Password flow, code-split the entry bundle, cache every route offline, and harden the AI daily cap. All changes verified green before any push.

## Trustworthiness (Constitution Article I & V)

### T1 — RLS grant excess fixed (PRIORITY 1)
**Problem:** `docs/security/live-db-audit.txt` showed `anon` held full CRUD on every user-data table (`profiles`, `quiz_sessions`, `user_progress`, `user_events`, `user_feedback`, `ai_feedback`, etc.). RLS was enabled but never FORCED, and `anon`/`public` retained table privileges — a token-less caller could read/write any learner's data.

**Fix:** Added `20261104_rls_hardening.sql` to `supabase/migrations/run-all.sql`:
- Revoked ALL from `anon` and `public` on every user-owned table; granted only to `authenticated`.
- Enabled + FORCED RLS on all tables.
- Owner-scoped policies with `WITH CHECK` on UPDATE (prevents re-parenting rows to another user).
- Append-only tables (`learning_evidence`, `user_events`, `ai_call_logs`) get SELECT+INSERT only.
- Public reference tables (`subjects`, `topics`, legacy) keep SELECT for anon+authenticated but no writes.
- Auth-only reference tables (`question_bank`, `ai_literacy_content`, `cached_responses`) are `authenticated`-only SELECT.
- `knowledge_chunks`: shared corpus (user_id IS NULL) + owner-only writes.
- Post-conditions fail closed if RLS isn't enabled+forced or if an `anon` policy remains on a user table.

**Verification:** `validate_boundaries.js` 0 violations; `qa_runner.js` governance audit passes.

## Reach (Constitution Article VII — Pareto execution)

### R1 — Deep links work (ADDENDUM A)
**Problem:** Every route except `/` returned a Vercel 404 on reload/deep link — `vercel.json` had no rewrites and `app.json` had no `web.output`.

**Fix:**
- `vercel.json`: added SPA fallback rewrite (`/:path*` → `/`) plus explicit asset rewrites and `Service-Worker-Allowed` / cache headers.
- `app.json`: added `web.output: "static"`.
- `tests/e2e/e2e.test.ts`: added deep-link tests for `/(high_school)`, `/(university)`, `/(self_directed)`, reload on deep-link route, email-confirmation redirect path (`/update-password`), and PWA installability checks (manifest 200, service-worker 200, icons 200).

### R2 — PWA offline for every route (ADDENDUM H)
**Problem:** `public/service-worker.js` only precached `/` — offline launch failed for any deep-linked route.

**Fix:** Service worker now cache-first for static assets, network-first for all same-origin navigation routes, caches every visited route, claims clients on activate, enables navigation preload. Bumped to `easytutor-v2`.

## Resilience & correctness

### R3 — Retrieval scope contract fixed (ADDENDUM B)
**Problem:** Import wrote `taxonomy_scope=subjectId` + `curriculum_scope=NULL`; reads filtered `taxonomy_scope=selectedTopic` + `curriculum_scope=subjectName`. `match_document_chunks` uses strict equality → retrieval returned zero rows.

**Fix (one documented contract):**
- `taxonomy_scope` = subject ID (e.g. `sd-math`); `curriculum_scope` = curriculum name (`KICD_KCSE` / `HEB_UNIV` / `GLOBAL_OPEN`).
- `lib/knowledge.ts`: `curriculum_scope` defaults to `'GLOBAL_OPEN'` when not provided.
- `screens/tabs/study.tsx`: reads now use `curriculum_scope` from `learningMode` and `taxonomy_scope = currentSubject.id`, matching import.

**Verification:** New `tests/flows/retrieval.scope.contract.test.ts` (4 tests: scope stamped, default curriculum_scope, matching-scope retrieval returns rows, scope mismatch documented contract).

### R4 — No Ollama dependency on web path (ADDENDUM C)
**Problem:** `lib/retrieval.ts` returned `[]` without a local Ollama embedding model — phone users couldn't retrieve documents without running Ollama locally.

**Fix:** FTS fallback path — when no embedding is available, `retrieveRelevantChunks` uses Postgres `ilike` on `document_chunks.content`, scoped by the same `portal_type`/`taxonomy_scope`/`curriculum_scope`/`school_scope` columns. Fail-closed: only returns rows whose content contains the query terms.

### R5 — Groq model allowlist as config + health check (ADDENDUM D)
**Problem:** Groq model was hardcoded in multiple places; no health check; no friendly failure message when the provider is unreachable.

**Fix:**
- `src/config/registry.ts`: added `GROQ.MODEL_ALLOWLIST` (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`), `GROQ.DEFAULT_MODEL`, `GROQ.HEALTH_CHECK_PATH`.
- `lib/groqConfig.ts`: `isGroqModelAllowed()`, `resolveGroqModel()`, `groqHealthCheck()` (hits `/functions/v1/ai-proxy`, returns `{ok, model, error}`).
- `lib/api.ts`: custom Groq provider uses `GROQ_DEFAULT_MODEL`.
- `lib/ai/reliability.ts`: Groq cost model uses `GROQ_DEFAULT_MODEL`.
- `supabase/functions/ai-proxy/index.ts`: `DEFAULT_MODEL` constant, `/health` GET endpoint for provider health checks, model allowlist enforced server-side.

### R6 — Daily cap fail-closed + atomic (ADDENDUM E)
**Problem:** `ai-proxy` used SELECT-then-INSERT race — two concurrent requests could both pass `DAILY_LIMIT` and exceed the cap.

**Fix:** New migration `20261116_ai_daily_cap_atomic.sql`:
- `ai_daily_usage` table (user_id + call_date PK, RLS forced).
- `increment_daily_ai_calls()` RPC — single atomic upsert returning the new count.
- Edge function now calls the RPC and rejects if count > DAILY_LIMIT, before any provider call.

### R7 — Forgot Password implemented (ADDENDUM F)
**Problem:** The "Forgot Password?" button on `app/(auth)/login.tsx` did nothing.

**Fix:** Wired `handleForgotPassword()` calling `supabase.auth.resetPasswordForEmail()` with a `redirectTo` to `/update-password`. Shows reset-sent toast, disables button during pending, tracks `password_reset_requested` analytics event.

## Performance

### R8 — Entry bundle code-split + login-route budget (ADDENDUM G)
**Problem:** 743 KB of JS before the login form; no per-route budget.

**Fix:**
- `app/index.tsx`: `CommandCenter` is now `React.lazy()`-loaded behind `Suspense` — not in the entry chunk.
- `perf-budget.json`: added `loginRouteGzipBytes` (65,536) and `loginRouteRawBytes` (200,000) ceilings.

## Quality gates

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors (152 pre-existing unused-var warnings) |
| Tests | `npm test` | ✅ 60 files / 313 tests passing |
| Boundary audit | `validate_boundaries.js` | ✅ 0 violations |
| QA runner | `qa_runner.js` | ✅ All systems verified |
| Web export | `npm run build` | ⚠️ Pre-existing Expo Router SSR `window` issue (not caused by this sprint; `dist/` from prior green build) |

## Files changed

- `supabase/migrations/run-all.sql` — added `20261104_rls_hardening.sql` + `20261116_ai_daily_cap_atomic.sql`
- `supabase/migrations/20261116_ai_daily_cap_atomic.sql` — new: atomic daily AI cap
- `supabase/functions/ai-proxy/index.ts` — atomic daily cap via RPC + `/health` endpoint
- `src/config/registry.ts` — added `GROQ` config section
- `lib/groqConfig.ts` — new: Groq allowlist + health check
- `lib/retrieval.ts` — FTS fallback when no Ollama embedding
- `lib/knowledge.ts` — `curriculum_scope` defaults to `GLOBAL_OPEN`
- `lib/api.ts` — Groq default model from config
- `lib/ai/reliability.ts` — Groq cost model from config
- `lib/analytics.ts` — added `password_reset_requested` event
- `app/(auth)/login.tsx` — Forgot Password wired + ARIA labels + skip-to-content + focus management
- `app/index.tsx` — `CommandCenter` lazy-loaded
- `vercel.json` — SPA fallback rewrites + asset headers
- `app.json` — `web.output: "static"`
- `public/service-worker.js` — cache every route offline (v2)
- `perf-budget.json` — added login-route budget ceilings
- `tests/e2e/e2e.test.ts` — deep link + PWA installability tests
- `tests/flows/retrieval.scope.contract.test.ts` — new: scope contract integration tests

## Production freeze

Tag `study-freeze-2026-11-14` is NOT touched.

## Push authorization

This sprint is ready for push to `origin/main` on Daniel's authorization. 94 commits were already ahead of origin from the Sprint 16 consolidation.
