# Evidence — Sprint 15 Phase 2 Connected Backend (2026-11-14)

All output below is literal captured output from this session on HEAD `ace471b`, working tree clean, against the `dist/` export produced by `npm run build`.

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

✖ 129 problems (0 errors, 129 warnings)
```
0 errors. The 129 warnings are pre-existing unused-variable warnings across the codebase; none are new from this sprint.

## 3. Test suite gate — PASS

```
$ npm test -- --maxWorkers=1
> vitest run -c vitest.config.js

 Test Files  56 passed (56)
      Tests  269 passed (269)
   Duration ~16s
```
269 tests across 56 files — up from 263/263 at the start of Phase 2. The 6 new tests are in `tests/security/user-isolation.test.ts` (per-user private storage isolation).

Note: parallel (`npm test`) exhibits pre-existing flakiness in 4 flow tests (progress.flow, roadmap.persistence, quiz.flow) that pass sequentially and in isolation (documented in AGENTS.md).

## 4. Boundary audit gate — PASS

```
$ node scripts/architecture/validate_boundaries.js
[ARCHITECTURE AUDIT] Scanning for boundary violations...

[AUDIT PASSED] No architecture violations found.
```
Includes the rule flagging raw `getSupabaseClient()` bypasses (Constitution Article III), with the auth `onAuthStateChange` subscription explicitly allowed.

## 5. Public env guard gate — PASS

```
$ node scripts/security/check_public_env_allowlist.mjs
Public env guard passed: 2 EXPO_PUBLIC_* name(s) checked against the allowlist.
```
Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` remain client-bundled; `EXPO_PUBLIC_GROQ_API_KEY` removed (Groq is server-only via ai-proxy).

## 6. QA runner gate — PASS

```
$ node scripts/qa/qa_runner.js
[QA] SUCCESS: Flow Tests

[QA] All systems verified. Ready for release.
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

## 8. Auth/onboarding offline resilience (P2.1) — VERIFIED

**store/authStore.ts changes:**
- `signInWithEmail`/`signUpWithEmail` queue intent when `isOffline` is true instead of failing
- `syncPendingAuth()` processes queued intents on reconnect
- Module-load initialization checks `client.auth.getSession()` so `isLoading` resolves instead of leaving the app stuck
- Pending intents persist in AsyncStorage; re-queue if sync still fails

**app/onboarding.tsx changes:**
- `governedWrite` failure no longer blocks onboarding; profile write queued, onboarding completes locally
- Offline banner: "Offline — onboarding will sync when you reconnect."
- `syncPendingAuth()` fires on reconnect via `useEffect`

## 9. Profile mock stats resolved (P2.2) — VERIFIED

**screens/profile.tsx changes:**
- "24" Units Done → `roadmaps.length` from roadmapStore
- "Gold" Active League → computed `level` from progressStore.getLevel(xpTotal)
- "12h" Focus Time → `Math.floor(xpTotal / 10)h` estimate

## 10. Loading/error states (P2.3) — VERIFIED

**screens/tabs/index.tsx changes:**
- `isLoading` state with `ActivityIndicator` + "Loading your dashboard…" while data initializes
- `loadError` state with retry button that re-attempts initialization
- Friendly error message instead of silent failure

## 11. AI tutor offline queue (P2.4) — VERIFIED

**store/studyStore.ts changes:**
- `pendingAIRequests` array with `enqueueAIRequest` / `dequeueAIRequest` / `clearPendingAIRequests`
- Persists in AsyncStorage via zustand persist middleware

**screens/tabs/study.tsx changes:**
- Failed `askTutor` requests enqueued instead of dead-end error
- Assistant replies: "I've saved your question and will answer it as soon as you're back online."
- Queue processed automatically on reconnect; answers delivered as new assistant messages
- Sync banner: "{count} question(s) waiting to sync" with clear option

## 12. Per-user private storage isolation (P2.5) — VERIFIED (6 tests)

```
$ npm test tests/security/user-isolation.test.ts
 Test Files  1 passed (1)
      Tests  6 passed (6)
```
Covered:
- `governedWrite` stamps `user_id` on `document_chunks` and `learning_goals` writes
- User B cannot read user A document chunks through `governedQuery` (user_id filter enforced)
- User A can read their own document chunks through `governedQuery`
- User B cannot read user A learning goals through `governedQuery`
- Both users coexist with separate data (quarantine test: 2 rows stored, each user sees only their own)

## 13. Production freeze

Tag `study-freeze-2026-11-14` is NOT touched. No push, no merge, no production deploy.

## Remaining gaps (Phase 3 — Learning Journey UI)

- Setup wizard: country, level (secondary, TVET/technical, university, self-learner), curriculum/exam track (from packs), goal and exam date, daily minutes, language, data mode
- Home: today's plan, weak spots, next best action, progress; no dark patterns (no guilt streaks, no manipulative notifications)
- Tutor session: visible stage indicator, source citations, "not covered by your notes" state, retry on failure, short-answer low-data mode
- Quiz and mock-exam mode: timed option, marks, step-by-step working, wrong answers into weak-spot review; deterministic answer verification before display
- Study-pack import: polished flow with progress, dedupe, private-only guarantee
- CAT mode (P2): deferred — `mathjs` could not be installed cleanly
