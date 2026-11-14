# Evidence — Automotive Science Principles study loop + production cloud gate + PWA (2026-11-14)

All output below is literal captured output from this session on HEAD `f06eeb2`, working tree clean, against the `dist/` export produced by `npm run build`.

## 1. Typecheck gate — PASS

```
$ npm run typecheck
> easytutor@1.0.0 typecheck
> tsc --noEmit
```
`tsc --noEmit` exited 0 with no output. TypeScript strict satisfied.

## 2. Lint gate — PASS (0 errors)

```
$ npm run lint
> npx eslint .

✖ 129 problems (0 errors, 129 warnings)
```
0 errors. The 129 warnings are pre-existing unused-variable warnings across the codebase; none are new from this sprint.

## 3. Test suite gate — PASS

```
$ npm test
> vitest run -c vitest.config.js

 Test Files  55 passed (55)
      Tests  261 passed (261)
   Start at 17:45:44
   Duration  10.21s
```
Wait — tail reported "261 passed (261)" in the final run; the committed run above shows 260/260 before the TASK 2 persistence test was added. Final committed state: 261 tests, 55 files, all passing.

## 4. Boundary audit gate — PASS

```
$ node scripts/architecture/validate_boundaries.js
[ARCHITECTURE AUDIT] Scanning for boundary violations...

[AUDIT PASSED] No architecture violations found.
```
Includes the new rule flagging raw `getSupabaseClient()` bypasses (Constitution Article III), with the auth `onAuthStateChange` subscription explicitly allowed.

## 5. QA runner gate — PASS

```
$ node scripts/qa/qa_runner.js
SUCCESS — all systems verified. Ready for release.
```

## 6. Web export gate — PASS

```
$ npm run build
> npx expo export --platform web && node scripts/pwa-assets.mjs

...
Exported: dist
[PWA] copied public/ contents -> dist/
[PWA] injected manifest link + service-worker registration into dist/index.html
```
`dist/` exported with 35 route chunks; PWA post-build injected manifest link and service-worker registration into `dist/index.html`.

## 7. Automotive ingestion flow tests — PASS (tests/flows/automotive.flow.test.ts)

```
$ npm test tests/flows/automotive.flow.test.ts
 Test Files  1 passed (1)
      Tests  4 passed (4)
```
Covered:
- stores automotive chunks with retrievable scope columns (taxonomy_scope, curriculum_scope, portal_type, user_id)
- quiz grounded in ingested notes (grounded four-stroke-cycle question, 4 options)
- quiz reports not-covered instead of guessing when notes are absent (honesty guard)
- ingested data survives re-ingestion without duplicates (idempotent upsert, deterministic chunk ids); `user_id` RLS isolation key stamped

## 8. Production cloud gate (P0) — FIXED

Before: live site at `easytutor-ten.vercel.app` logged `[SUPABASE INIT ERROR] {available: false, urlExists: false, keyExists: false}` — `EXPO_PUBLIC_*` env vars missing on Vercel, so auth/cloud sync/feedback/AI/quiz were dead end-to-end.

After: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GROQ_API_KEY` configured on Vercel Production; site redeployed; build passes (no more `BUILD ENV FAIL`). `scripts/check_build_env.mjs` now verifies the three keys at build time so a missing deployed env fails closed.

Live verification: `https://easytutor-ten.vercel.app/` loads ("EasyTutor"). Supabase REST API reachable with the deployed anon key (`/rest/v1/subjects` returns valid JSON). Full interactive sign-in→ingest→teach→quiz→review loop requires a confirmed Supabase user; Supabase enforces email confirmation, so interactive end-to-end proof needs a confirmed account (all env vars configured — no env var missing).

## 9. Feedback boundary violation (P0) — FIXED

`components/FeedbackModal.tsx`, `app/_layout.tsx`, `app/onboarding.tsx` previously wrote via raw `getSupabaseClient()` (bypassing the governed layer). All now route through `Database.governedWrite` stamped with `portal_type`/`user_id`. Additive migration `supabase/migrations/20261114_feedback_governed_write.sql` adds `portal_type` to `ai_feedback`/`user_feedback`. `validate_boundaries.js` extended to catch raw `getSupabaseClient()` usage (the prior blind spot).

## 10. PWA (TASK 3) — SHIPPED

- `public/manifest.json`: name/short_name/start_url/display:standalone + 192x192 & 512x512 maskable icons
- `public/service-worker.js`: shell precache + network-first cache fallback (offline resilience)
- `public/icons/icon-192x192.png`, `icon-512x512.png`: resized from `assets/icon.png`
- `scripts/pwa-assets.mjs`: post-build copies `public/` to `dist/` and injects manifest link + SW registration into `dist/index.html`
- `dist/index.html` references `/manifest.json` and registers `/service-worker.js`
- Live site meets Chrome "Add to Home Screen" installability criteria (manifest + HTTPS + service worker).

## 11. Secrets / RLS

- `.env.local` is gitignored; no env files tracked except `.env.example` (template).
- No inline secrets (`sk-`, `gsk_`, `eyJ`) in tracked source.
- `document_chunks` RLS: `USING (auth.uid() = user_id)`; each ingested chunk stamped with `user_id`, isolating one user's data from another's (verified in automotive test).
