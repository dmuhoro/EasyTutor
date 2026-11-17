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
| W1-1 CI green for real | DONE (implementation; commit pending) | `docs/evidence/wave1-1-ci-green.md` | declared-import gate in CI; quiz failure reproduced then fixed; `testTimeout` reverted; fresh-copy all 12 CI steps exit 0; local `npm test` 65 files/372 tests, 20.46s |
| W1-2 T2 at real boundary | IN PROGRESS (2a DONE; commit pending) | `docs/evidence/wave1-2-boundary.md` | 2a: default rail + legacy provider mapped to `ai-proxy`, fail-closed CI gate added, real-path test failed before / passed after; full suite 66 files/373 tests |
| W1-3 Local Supabase proof | NOT STARTED | — | |
| W1-4 Close T3–T6 | NOT STARTED | — | |
| W1-5 Phase 1 DONE demo | NOT STARTED | — | |
| W1-6 Budgets that bite | NOT STARTED | — | |
| Final report / release | NOT STARTED | — | branch must remain unpushed |

## Layer commits

- `a07c1f1` `docs(sprint20): Wave 1 truth-pass spec, ADR-009, progress log`
- `2f6f3bd` `docs(w1-0): correct truth docs — CI red, Phase 2 NOT MET, screens unwired`
- `cb11aca` `fix(w1-1): make CI green for real — declared imports, deterministic quiz, no timeout raise`
- *(pending commit)* `fix(w1-2a): route all hosted AI through ai-proxy, disable direct rail at CI gate`

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
