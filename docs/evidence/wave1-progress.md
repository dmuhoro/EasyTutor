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
| W1-2 T2 at real boundary | DONE (2a `8fd0029`, 2b `0202b69`, 2c `55d05a5`, 2d `d08dd9d`, 2e `38e2cc8`) | `docs/evidence/wave1-2-boundary.md` | proxy routing + CI gate; Ollama opt-in; private imports + ranked FTS; relabel migration; proxy health from live list; two-user privacy proven with real SQL; suite 69 files/385 tests |
| W1-3 Local Supabase proof | DONE WITH GAP (`04c1a45`) | `docs/evidence/wave1-3-local-supabase.md` | 104/104 RLS + 9/9 RPC privacy + 247/247 governance harness + loop green; `db reset` from zero NOT DONE (7 pre-existing migrations broken) → separate migration-repair follow-up |
| W1-4 Close T3–T6 | DONE (`2b583db`, `8c0f675`, `9610979`, `36fc1d2`) | `docs/evidence/wave1-4-t3-t6.md` | real-screen smoke 44/44; one home + nav 6/6; abortable quiz deadline 7/7; live GoTrue+Mailpit auth 4/4 (pinned to easytutor 54331/54325); Google OAuth round-trip manual-only |
| W1-5 Phase 1 DONE demo | PARTIAL (working tree, pre-commit) | `docs/evidence/wave1-5-demo.md` | `npm run e2e:full` 3/3; `npm run e2e:smoke` 9/9 wired into CI; 4 real defects fixed fail-first (layout bounce, skipped wizard steps, unreachable Review Continue, silent profile drop + migration). Cited answer/quiz/weak-spot/import/browser-offline/full-demo CI NOT DONE — itemised in evidence §5 |
| W1-6 Budgets that bite | DONE (`5296bfd`) | `docs/evidence/wave1-6-budgets.md` | dead budget fields removed; real 390px login JS ratchet 730,843 B enforced in CI; meta-test failed first then 2/2 green; breach rejected; ≤300 KB is investigation-only |
| Final report / release | NOT STARTED | — | branch must remain unpushed |

## Layer commits

- `a07c1f1` `docs(sprint20): Wave 1 truth-pass spec, ADR-009, progress log`
- `2f6f3bd` `docs(w1-0): correct truth docs — CI red, Phase 2 NOT MET, screens unwired`
- `cb11aca` `fix(w1-1): make CI green for real — declared imports, deterministic quiz, no timeout raise`
- `8fd0029` `fix(w1-2a): route all hosted AI through ai-proxy, disable direct rail at CI gate`
- `0202b69` `fix(w1-2b): make Ollama strictly opt-in — empty default, probe before fetch`
- `55d05a5` `fix(w1-2c): store embedding-less imports privately and retrieve via ranked FTS`
- `d08dd9d` `fix(w1-2d): relabel existing user-owned GLOBAL_OPEN chunks to USER_PRIVATE`
- `38e2cc8` `fix(w1-2e): derive ai-proxy health from the live model list`
- `9f2729b` `test(w1-3): prove local RLS, two-user privacy and post-hardening loop`

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

## W1-3 measurements (this session)

| Gate | Command | Result |
|---|---|---|
| From-zero reset (negative) | isolated `supabase start` in `/tmp/opencode/w1-dbtest` | exit 1; fails at `20260505_progress_system.sql` (`user_progress` missing) |
| Full migration failure list | 7 migrations applied to throwaway Supabase PG 17 | 7 pre-existing failures; both new `20261117_*` migrations EXIT=0 |
| RLS matrix (expected written first) | 104-case self-checking `psql -f` harness | 104/104 PASS; 1 corrected expectation (stricter grant-level denial) documented in evidence §3/§4 |
| Two-user RPC privacy | 9-case self-checking `psql -f` harness | 9/9 PASS across FTS + vector RPCs |
| Token-less caller | anon role, real SQL | reference tables readable (1 row each); `document_chunks` 42501 denied |
| Post-hardening loop | `npx vitest run -c vitest.config.js tests/flows/postHardeningLoop.test.ts` | 1/1 pass, exit 0 |
| RLS governance harness | `bash scripts/security/run_rls_matrix_local.sh` | rows=247 pass=247 fail=0 blocked=0, exit 0 |
| Full suite | `npm test` | 70 files / 386 tests pass, 19.97s |
| Typecheck | `npm run typecheck` | 0 errors, exit 0 |

## W1-4/T3 measurements (this session)

| Gate | Command | Result |
|---|---|---|
| Old gate reproduction | injected broken import / non-component / child crash into copy of old harness | all 3 PASSED green (38, 38, 39 tests), exit 0 — false protection |
| New gate — broken import | temp `app/__smoke_probe.tsx` importing missing module | FAILED, exit 1, 1 failed / 44 passed |
| New gate — non-component | temp route with object default export | FAILED, exit 1, 1 failed / 44 passed |
| New gate — child renderer crash | temp route whose child throws | FAILED, exit 1, 1 failed / 44 passed |
| New gate — clean tree | after probe removal | 44/44 pass, exit 0 |
| Full suite | `npm test` | 70 files / 394 tests pass, exit 0 |
| Typecheck | `npm run typecheck` | 0 errors, exit 0 |
| Lint | `npm run lint` | 0 errors / 188 warnings, exit 0 |
| Lockfile consistency | `npm ci --dry-run` | exit 0; React Native peer entries retained |

## W1-4/T4 measurements (this session)

| Gate | Command | Result |
|---|---|---|
| Nav gate (before fix) | `npx vitest run -c vitest.config.js tests/navigation/tabs-layout.test.tsx` | 2 failed / 4 passed, exit 1 — shadow `/` route + dead nav/dashboard components |
| Nav gate (after fix) | same command | 6/6 pass, exit 0 |
| Route smoke | same as T3 | 43/43 (42 routes + discovery), exit 0 |
| Full suite | `npm test` | 71 files / 399 tests pass, exit 0 |
| Typecheck | `npm run typecheck` | 0 errors, exit 0 |
| Lint | `npm run lint` | 0 errors / 187 warnings, exit 0 |
| Production web export | `npm run build` | exit 0; `dist/` regenerated |
| Perf budget | `npm run perf:budget` | gzip 443,090 B, raw 1,700,524 B, 37 route chunks, PASS |
| Declared imports | `npm run check:imports` | 395 files scanned, exit 0 |
| Circular dependencies | `npm run lint:cycles` | 0 errors / 13 warnings, 324 modules / 1170 dependencies |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | 0 violations, exit 0 |
| Secret exposure | `npm run guard:secret-exposure` | 272 files scanned, exit 0 |

## W1-4/T5 measurements (this session)

| Gate | Command | Result |
|---|---|---|
| Quiz reliability (before fix) | 5 original gaps injected into copies | all 5 reproduced failing first |
| Quiz reliability (after fix) | `npx vitest run -c vitest.config.js tests/flows/quiz.reliability.test.tsx` | 7/7 pass, exit 0; no timeout raised |

## W1-4/T6 measurements (this session)

| Gate | Command | Result |
|---|---|---|
| Live auth flow | `npm run test:auth-flow` | 4/4 pass, exit 0 against easytutor Kong 54331 + Mailpit 54325 |
| Injected wrong-route defect | temp copy with `/update-password` → `/wrong-route` | 2 failed / 2 passed, exit 1; copy deleted |
| Full suite | `npm test` | 72 files / 407 tests pass, exit 0 |

## W1-6 measurements (this session)

| Gate | Command | Result |
|---|---|---|
| Dead fields (before fix) | `npx vitest run -c vitest.config.js tests/perf/perf-budget-fields.test.ts` | 1 failed / 1 passed, exit 1 — `loginRouteGzipBytes`, `loginRouteRawBytes` unenforced |
| Real login-route measurement | `node scripts/perf/measure-login-route.js` | 3 JS resources, 730,843 B transferred @ 390px, PASS, exit 0 |
| Injected budget breach | `LOGIN_TRANSFERRED_BUDGET_BYTES=1000 node scripts/perf/measure-login-route.js` | 730,843 B > 1,000 B, FAIL, exit 1 |
| Meta-test (after fix) | same meta-test command | 2/2 pass, exit 0 |
| Entry budget | `npm run perf:budget` | gzip 443,088 B, raw 1,700,524 B, 37 route chunks, PASS |

## W1-5 measurements (this session)

| Gate | Command | Result |
|---|---|---|
| Fail-first: wizard bounce | `npm run e2e:full` (before fix) | `toHaveURL /\/setup-wizard/` failed, received `/onboarding`, exit 1 |
| Fail-first: skipped steps / timeout | `npm run e2e:full` (after bounce fix) | reached `Step 7 of 7`, then `Test timeout of 120000ms exceeded`, exit 1 |
| Fail-first: covered Review Continue | instrumented `npm run e2e:full` | `<div ... p-5 rounded-2xl ...> subtree intercepts pointer events` for full budget; W15 reached review but could not click Continue |
| Fail-first: silent profile drop | instrumented `npm run e2e:full` | `[DB WRITE FAILURE] [profiles] Could not find the 'country' column ...`; `emailRows=0 idRows=0` |
| Full demo (after fixes) | `npm run e2e:full` | 3 passed (8.4 s) |
| No-backend smoke | `npm run e2e:smoke` | 9 passed (55.3 s) |
| Login ratchet after W1-5 app fix (before offset) | `npm run perf:login-route` | 730,869 B > 730,843 B, FAIL exit 1 (26 B regression from the layout fix) |
| Login ratchet after debug-log offset (final) | `npm run perf:login-route` | 730,799 B ≤ 730,843 B (unchanged budget), PASS exit 0, 44 B headroom |
| `npm test` after adding the demo spec (before boundary fix) | `npm test` | 1 failed suite / 73 passed (74 files), 409 tests passed — Vitest collected the Playwright `.spec.ts` |
| `npm test` after `vitest.config.js` boundary fix (final) | `npm test` | 73 passed (73 files), 409 tests, PASS exit 0 |
| Build | `npm run build` | exit 0, `Exported: dist` |
| Forward migration | `psql -v ON_ERROR_STOP=1 < supabase/migrations/20261117_setup_wizard_preferences.sql` | `ALTER TABLE` exit 0; 7 columns present |
