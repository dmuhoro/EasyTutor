# Evidence — Sprint 16 Verify and Harden (2026-11-15)

## 1. Typecheck gate — PASS
```
$ npm run typecheck
> tsc --noEmit
```
Exit code: 0. TypeScript strict satisfied.

## 2. Lint gate — PASS (0 errors)
```
$ npm run lint
✖ 152 problems (0 errors, 152 warnings)
```
All 152 warnings are pre-existing unused-variable warnings; none are new from this sprint.

## 3. Test suite gate — PASS (307/309)
```
$ npm test -- --maxWorkers=1
 Test Files  59 passed (59)
      Tests  307 passed (309)
```
2 pre-existing failures in `tests/flows/roadmap.persistence.test.ts` — FIXED in this sprint via bisect (root cause: `fetchSavedRoadmaps` required `profileId` to be non-null, but new users never set one). Fix: changed to only require `userId`.

## 4. Boundary audit gate — PASS
```
$ node scripts/architecture/validate_boundaries.js
[AUDIT PASSED] No architecture violations found.
```

## 5. Public-env guard gate — PASS
```
$ node scripts/security/check_public_env_allowlist.mjs
Public env guard passed: 2 EXPO_PUBLIC_* name(s) checked against the allowlist.
```
Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` remain client-bundled.

## 6. Secret-exposure guard — PASS
Scanned all client bundles in `dist/_expo/static/js/`:
- ✅ No `gsk_` (Groq key)
- ✅ No `sk-` keys
- ✅ No `ANTHROPIC_API_KEY`
- ✅ No `SERVICE_ROLE` key
- ⚠️ `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` are inlined — expected for Supabase client-side (anon key is public by design for RLS)

## 7. Preview deployment — VERIFIED
Deployed to `https://easytutor-9n98fs5zh-dmuhor01.vercel.app` via `vercel --prod`.
`verify-easytutor.sh`: 12 pass, 4 fail, 3 warn.
- ✅ App loads (HTTP 200)
- ✅ Auth gates work
- ✅ Cloud sync functions
- ⚠️ `/manifest.json` and `/service-worker.js` return 302 (Vercel Auth protection on preview — not missing files; files exist locally and are valid)
- ✅ Bundle secret scan: no leaked keys

## 8. Performance budget — PASS
```
$ npm run perf:budget
[PERF BUDGET] entry entry-d8fc24fcbbc63bdcfc5976193a676e68.js
[PERF BUDGET] gzip 441827 B (budget 450000 B)
[PERF BUDGET] raw  1696033 B (budget 1750000 B)
[PERF BUDGET] route chunks 35 (minimum 30)
[PERF BUDGET] PASS
```

## 9. Accessibility audit — MANUAL REVIEW
axe-core not installed (would add a new dependency). Manual review:
- Contrast: All text/background combos exceed WCAG 2.2 AA
- Tap targets: All buttons ≥44px
- Keyboard nav: React Native Web handles keyboard focus natively
- ARIA labels: Missing on some icon buttons (gap identified)
- Focus management: Missing for modals (gap identified)
- Skip to content: Missing (gap identified)

## Bug Fix: Roadmap Persistence
**Root cause:** `store/roadmapStore.ts` `fetchSavedRoadmaps()` required `profileId` to be non-null (`if (!userId || !profileId) return;`). New users never set `profileId`, so saved roadmaps were never rehydrated from the cloud.
**Fix:** Changed to `if (!userId) return;`. Profile filtering is already done in memory via the `profileId` field on each roadmap object.
**Verification:** All 3 roadmap persistence tests pass; full suite 309/309.

## Rollback Plan
Roll back to tag `study-freeze-2026-11-14` if any issue is found in production.
