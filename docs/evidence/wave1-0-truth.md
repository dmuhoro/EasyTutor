# W1-0 evidence — Truth pass

All commands run on branch `fix/truth-pass` @ `a07c1f1` (spec layer) or its parent `cae99d9`,
session 2026-11-17. Output tails are copied verbatim.

## Repo identity

```
$ git rev-parse HEAD origin/main
cae99d9b8de0771f5862dd266cd66865f6d4739d
cae99d9b8de0771f5862dd266cd66865f6d4739d
$ git status --short
(empty)
```

## Local gates (green, but two of them masked)

```
$ npm test
 Test Files  64 passed (64)
      Tests  370 passed (370)
   Duration  60.91s

$ npm run typecheck
> tsc --noEmit
(no output, exit 0)

$ npm run lint   (pre-commit hook, this session)
✖ 190 problems (0 errors, 190 warnings)

$ npm run lint:cycles
x 13 dependency violations (0 errors, 13 warnings). 328 modules, 1195 dependencies cruised.

$ node scripts/architecture/validate_boundaries.js
[AUDIT PASSED] No architecture violations found.

$ node scripts/qa/qa_runner.js
 Test Files  64 passed (64)
      Tests  370 passed (370)
[QA] All systems verified. Ready for release.

$ npm run perf:budget
[PERF BUDGET] gzip 443493 B (budget 450000 B)
[PERF BUDGET] raw  1701922 B (budget 1750000 B)
[PERF BUDGET] route chunks 38 (minimum 30)
[PERF BUDGET] PASS
```

## Why local green != CI green

```
$ curl -s --max-time 3 http://localhost:11434/api/tags
OLLAMA_REACHABLE
{"models":[{"name":"gemma2:2b", ...
```

Local Ollama makes `retrieveRelevantChunks` take the vector RPC path that the quiz test stubs.
CI has no Ollama, so it takes the FTS path into an empty `document_chunks` table → the honesty
guard returns `options: []` → `expected 0 to be >= 2`.

```
$ grep -rn "@axe-core/playwright" --include=*.ts --include=*.tsx .
./tests/e2e/axe-a11y.test.ts:2:import { AxeBuilder } from '@axe-core/playwright';

$ node -e "console.log(require('./package.json').devDependencies['@axe-core/playwright'])"
undefined
```

`@axe-core/playwright` resolves locally only because it is **extraneous** in `node_modules`;
it is absent from `package.json` and `package-lock.json`.

## Fresh clone reproduction (exact CI install + typecheck)

```
$ rm -rf /tmp/opencode/easytutor-fresh
$ git clone /home/daniel-muhoro/workspace/projects/easytutor /tmp/opencode/easytutor-fresh
$ cd /tmp/opencode/easytutor-fresh && git checkout cae99d9 && npm ci
NPM_CI_OK

$ npm run typecheck
> tsc --noEmit
tests/e2e/axe-a11y.test.ts(2,28): error TS2307: Cannot find module '@axe-core/playwright' or its corresponding type declarations.
tests/e2e/axe-a11y.test.ts(19,54): error TS7006: Parameter 'v' implicitly has an 'any' type.
TSC_EXIT=2
```

## Phase 2 truth

```
$ grep -rn "screens/home/today\|screens/tutor/session\|screens/practice/index\|screens/library/index\|screens/progress/index\|screens/setup/index\|screens/settings/index" app components --include=*.ts --include=*.tsx
(no matches)
```

All seven Phase 2 screens are unwired dead code (only `screens/settings` is referenced by a
route wrapper under a different import path; the `screens/*` Phase 2 tree itself has no consumers).

```
$ head -6 docs/design/DESIGN.md
# EasyTutor Design — Phase 2
**Status:** Draft — awaiting approval (Step 0).
```

## Phase 2 acceptance (prior verification this session, re-stated here)

- Lighthouse mobile Performance: **36** (target ≥ 80) — see the dedicated Lighthouse JSON/command
  in `docs/evidence/wave1-6-budgets.md` where it is re-measured on `dist/`.
- axe: 48/48 passed (4 routes × 3 viewports × 2 themes), zero serious/critical.
- Playwright visual baselines: 69 passed / 27 failed of 96 tests.
- Login-route JS: ~729 KB transferred (target ≤ 300 KB).
- Phase 1 E2E: not run in CI; specs excluded from vitest.

**Verdict: Phase 2 acceptance NOT MET.**

## CI state

- Phase 1 merge commit run `43927712086`: FAILED, `tests/flows/quiz.wrongAnswers.test.ts`
  `expected 0 to be greater than or equal to 2`.
- Phase 2 merge commit run `44050144294`: FAILED, typecheck `TS2307` + `TS7006`.
- Fresh-clone reproduction above confirms both failures are real, not local artifacts.

**Verdict: CI RED on both merge commits.**
