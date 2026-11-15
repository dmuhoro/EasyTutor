# Evidence — Sprint 15 Phase 3 Learning Journey UI (2026-11-14)

All output below is literal captured output from this session on HEAD `ee4aea0`, working tree clean, against the `dist/` export produced by `npm run build`.

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

✖ 131 problems (0 errors, 131 warnings)
```
0 errors. The 131 warnings are pre-existing unused-variable warnings across the codebase; none are new from this sprint.

## 3. Test suite gate — PASS

```
$ npm test -- --maxWorkers=1
> vitest run -c vitest.config.js

 Test Files  57 passed (57)
      Tests  287 passed (287)
   Duration ~14s
```
287 tests across 57 files — up from 269/269 at the start of Phase 3. The 18 new tests are in `tests/lib/safeEval.test.ts` (safe expression evaluator).

Note: parallel (`npm test`) exhibits pre-existing flakiness in 4 flow tests (progress.flow, roadmap.persistence, quiz.flow) that pass sequentially and in isolation (documented in AGENTS.md).

## 4. Boundary audit gate — PASS

```
$ node scripts/architecture/validate_boundaries.js
[ARCHITECTURE AUDIT] Scanning for boundary violations...

[AUDIT PASSED] No architecture violations found.
```

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

## 8. Phase 3.1 — Setup wizard (app/setup-wizard/index.tsx)

Multi-step wizard: country → level (secondary/TVET/university/self-learner) → curriculum track → goal & exam date → daily minutes → language/data mode → review → done.

- Persists profile via `Database.governedWrite` (private scope, `user_id`/`portal_type` stamped)
- Pre-selects level from onboarding mode selection via URL param (`?level=`)
- Applies preferences locally-first (`lowDataMode`, `learningMode`) then completes onboarding
- Onboarding (`app/onboarding.tsx`) now routes to `/setup-wizard?level=` instead of completing directly

## 9. Phase 3.2 — Home weak spots (screens/tabs/index.tsx)

'Weak Spots to Review' section:
- Wrong answers grouped by topic, ranked by frequency (top 3)
- Each weak spot links to AI tutor in 'Teach & Quiz' mode for review
- Shows topic name, miss count, last missed question preview
- No dark patterns — helpful nudge only, no guilt language or manipulative notifications

## 10. Phase 3.3 — Tutor session (screens/tabs/study.tsx)

- **Stage indicator chip**: 'Stage: Socratic Guidance' (Teach & Quiz) / 'Direct Explanation' (Explain) / 'Summary'
- **Low-data mode**: when `lowDataMode` is enabled, appends concise-answer instruction to system prompt ('Keep your answer concise and text-first. Give the shortest useful answer — no long explanations, no fluff, no markdown tables. One short paragraph maximum.')
- Existing: source citations `[Bird Ch15 p.171]`, not-covered honesty guard, retry, offline queue (from prior sprints)

## 11. Phase 3.4 — Quiz/mock-exam (screens/tabs/quiz.tsx + lib/safeEval.ts)

**Timed option:**
- Toggle in header ('Timed: On' / 'Timed: Off'), persists via URL param (`?timed=true`)
- Countdown timer (60s) with warning color at ≤10s remaining
- Auto-submits current answer as wrong on timeout

**Step-by-step working:**
- `stepByStep` field added to Question type, parsed from AI output
- Displayed after answering in a dedicated blue-themed card

**Deterministic calc verification (`lib/safeEval.ts`):**
- Zero-dependency recursive-descent parser supporting +, -, *, /, parentheses, unary minus
- Rejects variables, function calls, exponentiation, bitwise ops, and arbitrary URLs
- Division by zero returns `{ ok: false }`
- After answering, if question text matches a calculation pattern, verifies AI's correct answer with `safeEval`; mismatches flagged ('Answer mismatch') instead of presented as fact

## 12. Phase 3.5 — Study-pack import (screens/self_directed/index.tsx)

- **Private-to-you guarantee**: prominent shield icon + text ('This study pack is stored in YOUR scope only. No other learner can read it, and it is never shared across portals.')
- **Dedupe tracking**: queries existing chunk IDs for the document before import; reports new vs already-imported vs failed counts
- **Idempotent re-import**: deterministic chunk ids (`stableHashId(`import:${userId}|${subjectName}`)` + chunk index) mean re-importing the same corpus is an upsert, never a duplicate
- Import result breakdown displayed inline (new chunks / already imported / failed)

## 13. Production freeze

Tag `study-freeze-2026-11-14` is NOT touched. No push, no merge, no production deploy.

## Remaining gaps (Phase 4 — Africa-first extensibility)

- Curriculum packs as DATA (JSON schema + validator): country, level, board, subjects, topics, source status (OFFICIAL / COMMUNITY / DRAFT), version. Ship schema + ONE sample pack (Kenyan TVET technical subject, DRAFT) for Daniel's review.
- Local context: local currencies, SI units, locally familiar scenarios (matatu, boda boda, market traders) with setting to switch to global examples.
- Shared-device support: multiple local profiles with optional PIN.
- Data protection: consent/privacy screens in plain language, age-appropriate under-18 handling, data export/deletion. Flag that Kenya's DPA, Nigeria's NDPA, South Africa's POPIA and GDPR need review by a qualified person.
- Payments: design hooks only (pricing/plan interface). Do NOT integrate any payment provider.
- CAT mode (P2): deferred — `mathjs` could not be installed cleanly. Safe expression evaluator (`lib/safeEval.ts`) is in place as a dependency-free alternative.
