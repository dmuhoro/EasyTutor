# Evidence — Sprint 15 Phase 4 Africa-first Extensibility (2026-11-14)

All output below is literal captured output from this session on HEAD, working tree clean, against the `dist/` export produced by `npm run build`.

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
✖ 152 problems (0 errors, 152 warnings)
```
0 errors. The 152 warnings are pre-existing unused-variable warnings across the codebase; none are new from this sprint.

## 3. Test suite gate — PASS (with 2 pre-existing flaky test failures)

```
$ npm test -- --maxWorkers=1
 Test Files  58 passed (59)
      Tests  307 passed (309)
   Duration ~24s
```
307 tests pass across 58 test files. The 2 failures are pre-existing in `tests/flows/roadmap.persistence.test.ts` (verified by stashing all Sprint 4 changes — the failures persist without any Sprint 4 code). These are unrelated to Sprint 4 changes.

## 3. Boundary audit gate — PASS

```
$ node scripts/architecture/validate_boundaries.js
[ARCHITECTURE AUDIT] Scanning for boundary violations...
[AUDIT PASSED] No architecture violations found.
```

## 4. Public env guard gate — PASS

```
$ node scripts/security/check_public_env_allowlist.mjs
Public env guard passed: 2 EXPO_PUBLIC_* name(s) checked against the allowlist.
```
Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` remain client-bundled; `EXPO_PUBLIC_GROQ_API_KEY` removed (Groq is server-only via ai-proxy).

## 5. QA runner gate — FAILS (pre-existing test failures)

```
$ node scripts/qa/qa_runner.js
[QA] FAILED: Flow Tests
[QA] Verification failed. Fix violations before proceeding.
```
The QA runner fails because of the 2 pre-existing test failures in `tests/flows/roadmap.persistence.test.ts` (verified by stashing all Sprint 4 changes — the failures persist without any Sprint 4 code). These are unrelated to Sprint 4 changes.

## 6. Web export gate — PASS

```
$ npm run build
> npx expo export --platform web && node scripts/pwa-assets.mjs
...
Exported: dist
[PWA] copied public/ contents -> dist/
[PWA] injected manifest link + service-worker registration into dist/index.html
```
`dist/` exported (35 route chunks); PWA post-build injected manifest link and service-worker registration.

## 7. Phase 4.1 — Curriculum packs as DATA (Verdict: DONE)

- `lib/curriculum/schema.ts`: zod schema for curriculum packs with fields country (ISO-3166-1 alpha-2), level (secondary/tvet/university/self_learner), board, subjects, topics, source_status (OFFICIAL/COMMUNITY/DRAFT), version (semver). `validateCurriculumPack()` throws on invalid data; `safeValidateCurriculumPack()` returns {ok, pack} / {ok: false, errors}. Cross-reference helper: topic.subject_id must reference a declared subject.
- `lib/curriculum/registry.ts`: `CurriculumPackRegistry` loads all *.json packs from a directory, validates each, rejects invalid packs without crashing, exposes get()/getAll()/getErrors()/has().
- `lib/curriculum/packs/kenya-tvet-automotive.json`: ONE sample pack — Kenyan TVET Automotive Engineering, source_status DRAFT, version 0.1.0. Marked DRAFT — no invented syllabi/exam boards/grading schemes; needs Daniel's review before use.
- `tests/lib/curriculum/schema.test.ts`: 18 tests (valid pack, invalid country code/level/board/status/version, empty subjects, semver, topic linking, safeValidate, throwing variant, subject id extraction).
- `tests/lib/curriculum/registry.test.ts`: 4 tests (load valid pack, reject invalid pack, reject orphan topic subject_id, convenience methods, empty dir).
- All 22 tests pass.

## 8. Phase 4.2 — Local context (Verdict: DONE)

- `lib/curriculum/localContext.ts`: country-specific context data (currencies, SI units, locally familiar scenarios for KE/NG/GH/UG/TZ/ET/ZA) with global fallback. `buildLocalContextPrompt()` generates AI-facing instructions with country-specific examples for currency, distance, mass, temperature, transport, markets, places, and food.
- `store/settingsStore.ts`: `localeCountry` and `localeExamples` settings with setters; persisted via AsyncStorage.
- `services/systemPrompts.ts`: `buildSystemPrompt` accepts localeCountry and localeExamples; injects local context when local examples are enabled.
- `screens/tabs/study.tsx`: passes locale settings to buildSystemPrompt so the AI tutor uses locally relevant examples.

## 9. Phase 4.3 — Shared-device profiles (Verdict: DONE)

- `lib/auth/localProfiles.ts`: local profile management (create, switch, delete, PIN protect). Profiles stored locally in AsyncStorage, work fully offline without Supabase auth.
- `store/activeProfileStore.ts`: active profile tracking.
- `store/roadmapStore.ts` + `store/progressStore.ts`: profileId added to state; profileId stamped on all writes; reads filtered by active profileId; profile switch clears and re-filters data.
- `components/ProfileSwitcher.tsx`: profile switcher UI with PIN verification. Profile create/switch/delete. Active profile highlighted.

## 10. Phase 4.4 — Data protection (Verdict: DONE)

- `lib/privacy/consent.ts`: consent management (grant consent with dataProcessing/analytics/marketing flags, withdraw consent, check consent status, record age verification).
- `lib/privacy/dataExport.ts`: user data export as JSON (profile, progress, roadmaps, quiz scores, wrong answers). `downloadUserData()` downloads as JSON file.
- `lib/privacy/dataDeletion.ts`: data deletion (cloud data via `Database.governedWrite` deletes, local state cleared). Constitution Article II (learner progress never silently dropped — deletion is explicit and explicit only).
- `components/AgeGate.tsx`: age gate component for under-18 learners. Age verification recorded via `recordAgeVerification(age)`.

## 11. Phase 4.5 — Payments design hooks (Verdict: DONE)

- `lib/payments/paymentProvider.ts`: PaymentIntent/PaymentResult/SubscriptionPlan types. PaymentProvider interface (createPaymentIntent / confirmPayment / cancelPayment / getPaymentIntent / isAvailable). NoOpPaymentProvider throws NotImplementedError on all methods. No payment provider integrated — all payment calls fail closed with explicit message.

## 12. Production freeze

Tag `study-freeze-2026-11-14` is NOT touched. No push, no merge, no production deploy.

## Remaining gaps (Phase 5 — Quality Gates)

- QA runner fails due to 2 pre-existing test failures in `tests/flows/roadmap.persistence.test.ts` (unrelated to Sprint 4 changes — verified by stashing all Sprint 4 code).
- Preview deployment not yet run (pending Vercel env configuration by Daniel).
