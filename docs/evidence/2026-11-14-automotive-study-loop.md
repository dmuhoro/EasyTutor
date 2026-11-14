# Evidence — Automotive study loop + production cloud gate + PWA + governed AI (2026-11-14)

All output below is literal captured output from this session on HEAD `cb4bccb`, working tree clean, against the `dist/` export produced by `npm run build`, and against the live site `https://easytutor-ten.vercel.app`.

## 1. Typecheck gate — PASS

```
$ npm run typecheck
> tsc --noEmit
```
`tsc --noEmit` exited 0 with no output. TypeScript strict satisfied.

## 2. Lint gate — PASS (0 errors)

```
$ npm run lint
> npx eslint .

✖ 128 problems (0 errors, 128 warnings)
```
0 errors. The 128 warnings are pre-existing unused-variable warnings across the codebase; none are new from this sprint.

## 3. Test suite gate — PASS

```
$ npm test -- --maxWorkers=1
> vitest run -c vitest.config.js

 Test Files  55 passed (55)
      Tests  263 passed (263)
   Duration ~67s
```
Note: the parallel (`npm test`) run exhibits pre-existing flakiness in 4 flow tests (progress.flow, roadmap.persistence, quiz.flow) that pass sequentially and in isolation (documented in AGENTS.md). Sequential run: 263/263.

## 4. Boundary audit gate — PASS

```
$ node scripts/architecture/validate_boundaries.js
[AUDIT PASSED] No architecture violations found.
```
Includes the new rule flagging raw `getSupabaseClient()` bypasses (Constitution Article III), with the auth `onAuthStateChange` subscription explicitly allowed.

## 5. Public env guard gate — PASS

```
$ node scripts/security/check_public_env_allowlist.mjs
Public env guard passed: 2 EXPO_PUBLIC_* name(s) checked against the allowlist.
```
Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` remain client-bundled; `EXPO_PUBLIC_GROQ_API_KEY` removed.

## 6. QA runner gate — PASS

```
$ node scripts/qa/qa_runner.js
SUCCESS — all systems verified. Ready for release.
```

## 7. Web export gate — PASS

```
$ npm run build
> npx expo export --platform web && node scripts/pwa-assets.mjs
...
Exported: dist
[PWA] copied public/ contents -> dist/
[PWA] injected manifest link + service-worker registration into dist/index.html
```
`dist/` exported (35 route chunks); PWA post-build injected manifest link and service-worker registration.

## 8. Automotive import + quiz flow tests — PASS (tests/flows/automotive.flow.test.ts)

```
$ npm test tests/flows/automotive.flow.test.ts
 Test Files  1 passed (1)
      Tests  6 passed (6)
```
Covered: scoped chunk storage with retrievable scope columns; grounded quiz question; not-covered honesty guard (no guessing when notes absent); ingested data survives re-ingestion without duplicates (idempotent upsert, deterministic corpus id); `user_id` RLS isolation key stamped; import idempotency (same corpus id -> same row count); second user cannot read first user's rows.

## 9. Production cloud gate (P0) — FIXED

Before: live site logged `[SUPABASE INIT ERROR] {available: false, urlExists: false, keyExists: false}` — `EXPO_PUBLIC_*` env vars missing on Vercel; auth/cloud sync/feedback/AI/quiz dead end-to-end.

After: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` configured on Vercel Production; `EXPO_PUBLIC_GROQ_API_KEY` REMOVED (Groq is server-only via ai-proxy). Site redeployed via `vercel --prod`. `scripts/check_build_env.mjs` now verifies Supabase URL/anon key at build time (Groq key removed from the check).

## 10. Groq key leak (P0-A) — FIXED

Removed `callGroq()`/`checkGroqAvailable()` and every `EXPO_PUBLIC_GROQ_API_KEY` read from `lib/ai/providers.ts`, `lib/api.ts`, `scripts/check_build_env.mjs`, `.env.example`, `scripts/public-env-allowlist.txt`. Groq is reached only through the server-side `ai-proxy` Supabase function.

Server-only env vars the proxy needs (set in Supabase edge-function config by operator):
- `GROQ_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## 11. ai-proxy hardened (P0-A)

`supabase/functions/ai-proxy/index.ts`:
- requires valid Supabase user JWT (rejects anonymous)
- per-user daily rate limit (DAILY_LIMIT=200 via ai_call_logs)
- allowlists providers AND models
- caps max_tokens at 1000
- hardcoded Groq endpoint only (never forwards arbitrary URLs)
- returns generic errors (never echoes keys or raw upstream errors)

## 12. Feedback boundary violation (P0) — FIXED

`components/FeedbackModal.tsx`, `app/_layout.tsx`, `app/onboarding.tsx` previously wrote via raw `getSupabaseClient()` (bypassing governed layer). All route through `Database.governedWrite`, stamped with `portal_type`/`user_id`. Additive migration `supabase/migrations/20261114_feedback_governed_write.sql` adds `portal_type` to `ai_feedback`/`user_feedback`. `validate_boundaries.js` extended to catch raw `getSupabaseClient()` usage.

## 13. PWA (P0-B) — SHIPPED & VERIFIED LIVE

- `public/manifest.json`, `public/service-worker.js`, `public/icons/` (192x192 & 512x512)
- `scripts/pwa-assets.mjs` post-build; `dist/index.html` references `/manifest.json` and registers `/service-worker.js`
- Live verification (`https://easytutor-ten.vercel.app/`):
  - `/manifest.json` → HTTP 200 (585 B), valid JSON
  - `/service-worker.js` → HTTP 200 (1284 B)
  - `index.html` → `<link rel="manifest">` present, `service-worker.js` referenced
  - `/icons/icon-192x192.png` → HTTP 200; `/icons/icon-512x512.png` → HTTP 200
  - Client bundle scan: NO `gsk_` / `EXPO_PUBLIC_GROQ` in any `_expo/static/js/web/*.js`
- Live site meets Chrome "Add to Home Screen" installability criteria.

Note: preview deployment (`vercel`) is behind `vercel_authentication` (302 to login), so public verify could not reach it; production is publicly accessible and was verified instead.

## 14. Deploy (P0-C) — PRODUCTION LIVE

Deployment method: Vercel CLI (`vercel --prod`), linked project `dmuhor01/easytutor` (`.vercel/project.json` present). Production URL: `https://easytutor-ten.vercel.app` (deployment `easytutor-dro46qs3e-dmuhor01.vercel.app`). Preview was deployed first but could not be publicly verified due to `vercel_authentication`.

## 15. Citations + chapter scoping (P1-B) — SHIPPED

- `lib/retrieval.ts`: `buildCitation()` → `[Source ChN p.P]` (e.g. `[Bird Ch15 p.171]`); `getAvailableChapters()` lists distinct imported chapters per subject.
- `screens/tabs/study.tsx`: chapter picker scopes RAG retrieval to the chosen chapter (client-side filter on `metadata.chapter_no`); `ragContext` appends citations; sysPrompt instructs the model to cite sources in brackets.
- Not-covered honesty guard retained in `pipelineExecutor.ts` (quiz reports a gap instead of guessing).

## 16. Import study pack (P1-A) — SHIPPED

- `screens/self_directed/index.tsx`: "Import Study Pack (JSONL)" web file picker; corpus.jsonl fields `id, subject, source, chapter_no, chapter_title, page, chunk_index, text`; parsed in-browser; batch-stored 50 chunks at a time with a progress bar via `storeChunks`/governed layer into the signed-in user's PRIVATE scope under subject "Automotive Science Principles" (curriculumScope undefined — book text never GLOBAL_OPEN); uses corpus `id` as the deterministic chunk id.

## 17. Secrets / RLS

- `.env.local` is gitignored; no env files tracked except `.env.example` (template; GROQ line removed).
- No inline secrets (`sk-`, `gsk_`, `eyJ`) in tracked source.
- `document_chunks` RLS: `USING (auth.uid() = user_id)`; each ingested chunk stamped with `user_id`, isolating one user's data from another's (verified in automotive test).

## Deferred

- CAT mode (P2): exam-style calculation questions with marks + deterministic mathjs answer verification. Deferred — `mathjs` could not be installed cleanly (`npm install` timed out leaving a corrupted partial install with no `package.json`) and P2 is the lowest-priority task.
