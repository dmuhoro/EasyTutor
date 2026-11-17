# Wave 1 progress log (living document)

Branch: `fix/truth-pass` from `origin/main` @ `cae99d9`. Update after every task. No number is
recorded here unless a command in this session produced it.

## Session setup (2026-11-17)

- `git rev-parse HEAD origin/main` → both `cae99d9b8de0771f5862dd266cd66865f6d4739d`.
- `git status --short` → clean.
- `git checkout -b fix/truth-pass origin/main` → branch created, tracking `origin/main`.
- Tooling: node v22.22.1, npm 11.12.1, vitest 4.1.5, supabase CLI 3.0.0, Docker daemon up.
- `curl -s --max-time 3 http://localhost:11434/api/tags` → reachable (`gemma2:2b`). This is
  the cause of the local-vs-CI quiz-test discrepancy: local Ollama makes the vector path run;
  CI has no Ollama and takes the FTS path into an empty table.

## Baseline gates (this session, before any change)

| Gate | Command | Result |
|---|---|---|
| Tests | `npm test` | 64 files / 370 tests pass, 60.91s |
| Typecheck | `npm run typecheck` | 0 errors (masked: `@axe-core/playwright` is extraneous locally) |

## Task status

| Task | Status | Evidence | Notes |
|---|---|---|---|
| Layer 0 — spec + ADR-009 + progress log | DONE (`a07c1f1`) | this file, `sprints/sprint_20_wave1_truth_pass.md`, `docs/adr/ADR-009-private-import-fts-retrieval.md` | ADR-009 resolves ADR-003/005 conflict |
| W1-0 Truth | DONE | `docs/evidence/wave1-0-truth.md` | STATUS.md rewritten; CHANGELOG + sprint_19 corrected; CI red, Phase 2 NOT MET, screens UNWIRED, Lighthouse 36/26 |
| W1-1 CI green for real | DONE (`cb11aca`) | `docs/evidence/wave1-1-ci-green.md` | declared-import gate in CI; quiz failure reproduced then fixed; `testTimeout` reverted; fresh-copy all 12 CI steps exit 0; local `npm test` 65 files/372 tests, 20.46s |
| W1-2 T2 at real boundary | IN PROGRESS (2a `8fd0029`, 2b `0202b69`, 2c `55d05a5`, 2d `d08dd9d` committed; 2e done, commit pending) | `docs/evidence/wave1-2-boundary.md` | 2a: proxy routing + CI gate; 2b: Ollama opt-in; 2c: private imports + ranked FTS, real SQL privacy; 2d: relabel migration, real SQL; 2e: proxy health from live model list, 5 tests; suite 69 files/385 tests |
| W1-3 Local Supabase proof | NOT STARTED | — | |
| W1-4 Close T3–T6 | NOT STARTED | — | |
| W1-5 Phase 1 DONE demo | NOT STARTED | — | |
| W1-6 Budgets that bite | NOT STARTED | — | |
| Final report / release | NOT STARTED | — | branch must remain unpushed |

## Layer commits

- `a07c1f1` `docs(sprint20): Wave 1 truth-pass spec, ADR-009, progress log`
- `2f6f3bd` `docs(w1-0): correct truth docs — CI red, Phase 2 NOT MET, screens unwired`
- `cb11aca` `fix(w1-1): make CI green for real — declared imports, deterministic quiz, no timeout raise`
- `8fd0029` `fix(w1-2a): route all hosted AI through ai-proxy, disable direct rail at CI gate`
- `0202b69` `fix(w1-2b): make Ollama strictly opt-in — empty default, probe before fetch`
- `55d05a5` `fix(w1-2c): store embedding-less imports privately and retrieve via ranked FTS`
- `d08dd9d` `fix(w1-2d): relabel existing user-owned GLOBAL_OPEN chunks to USER_PRIVATE`
- *(pending commit)* `fix(w1-2e): derive ai-proxy health from the live model list`

## W1-0 measurements (this session)

| Gate | Command | Result |
|---|---|---|
| Cycles | `npm run lint:cycles` | 0 errors / 13 warnings, 328 modules |
| Boundaries | `node scripts/architecture/validate_boundaries.js` | 0 violations |
| QA | `node scripts/qa/qa_runner.js` | SUCCESS, 370/370 |
| Perf budget | `npm run perf:budget` | gzip 443,493 B, raw 1,701,922 B, 38 route chunks, PASS |
| Lighthouse `/login` | `npx lighthouse ... http://127.0.0.1:4173/login` | Performance 26; FCP 9.7 s, LCP 20.4 s, TBT 3,980 ms, SI 11.3 s, CLS 0 |
| Fresh CI typecheck | `npm ci` + `npm run typecheck` in `/tmp/opencode/easytutor-fresh` | exit 2: TS2307 `@axe-core/playwright`, TS7006 `axe-a11y.test.ts:19` |
| Phase 2 wiring | `grep -rn "screens/.../index" app components` | no matches → unwired |

## W1-1 measurements (this session)

| Gate | Command | Result |
|---|---|---|
| Declared imports (before) | `node scripts/qa/check-declared-imports.mjs` | FAIL, `@axe-core/playwright` undeclared, exit 1 |
| Declared imports (after) | `npm run check:imports` | PASS, 391 files scanned, 0 undeclared |
| Typecheck (after) | `npm run typecheck` | 0 errors (TS7006 resolved via real types, no `any`) |
| Quiz regression (before fix) | focused vitest, embeddings forced null | `expected 0 to be greater than or equal to 2`, exit 1 |
| Quiz tests (after fix) | focused vitest, 2 files | 7/7 pass at default 5 s timeout |
| Full suite | `npm test` | 65 files / 372 tests pass, 20.46s |
| Fresh-copy CI | 12 steps in `/tmp/opencode/easytutor-ci-proof` | all STEP_EXIT=0 (`npm ci` → `perf:budget`) |

## W1-2c measurements (this session)

| Gate | Command | Result |
|---|---|---|
| Import regression (before fix) | focused vitest, embeddings null | `{ stored: 0, failed: 50 }`, FTS RPC never called, exit 1 |
| Import regression (after fix) | focused vitest | 2/2 pass, exit 0 |
| Full suite | `npm test` | 68 files / 380 tests pass, 14.91s |
| Typecheck | `npm run typecheck` | 0 errors, exit 0 |
| Migration applies cleanly | throwaway Supabase PG 17, from zero | `20261117_private_import_fts.sql EXIT=0`; tsvector col + GIN index + RPC present |
| Two-user privacy (real SQL) | `auth.uid()` via `request.jwt.claim.sub` | A sees only A, B sees only B, USER_PRIVATE visible to owner, anon sees 0 |
| Pre-existing migration defects | from-zero migration run | 5 older migrations fail on invalid syntax / duplicate objects — tracked for W1-3 |

## W1-2d/e measurements (this session)

| Gate | Command | Result |
|---|---|---|
| Relabel (before/after) | real SQL, throwaway Supabase PG 17 | GLOBAL_OPEN 2 → 0; USER_PRIVATE 1 → 3; KICD_KCSE 1 untouched; 2nd run UPDATE 0 |
| Health tests (before fix) | focused vitest | 3 failed / 2 passed, 502 instead of 200 etc., exit 1 |
| Health tests (after fix) | focused vitest | 5 passed, exit 0 |
| Edge function typecheck | `deno check supabase/functions/ai-proxy/index.ts` | exit 0 (Deno 2.9.7) |
| Full suite | `npm test` | 69 files / 385 tests pass, 14.67s |
