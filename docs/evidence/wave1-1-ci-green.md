# W1-1 evidence — CI green for real

Session 2026-11-17. Every number below comes from a command run in this session.

## 1. Reproduction on a fresh clone (before any fix)

```
$ rm -rf /tmp/opencode/easytutor-fresh
$ git clone /home/daniel-muhoro/workspace/projects/easytutor /tmp/opencode/easytutor-fresh
$ cd /tmp/opencode/easytutor-fresh && git checkout cae99d9 && npm ci
NPM_CI_OK

$ npm run typecheck
tests/e2e/axe-a11y.test.ts(2,28): error TS2307: Cannot find module '@axe-core/playwright' or its corresponding type declarations.
tests/e2e/axe-a11y.test.ts(19,54): error TS7006: Parameter 'v' implicitly has an 'any' type.
TSC_EXIT=2
```

Local `npm run typecheck` was 0 errors on the same commit because `@axe-core/playwright`
was **extraneous** in local `node_modules` (declared in neither `package.json` nor lockfile).

## 2. Declared-import gate

New dev-only gate `scripts/qa/check-declared-imports.mjs` scans static ESM imports in
`app/ components/ lib/ screens/ services/ src/ store/ tests/ hooks/ data/` and fails closed
when a bare package is not declared in `package.json`. It ignores relative paths, tsconfig
`@/` aliases, `node:` builtins, and guarded dynamic `require()` calls with fallbacks.

Before declaring the package:

```
$ node scripts/qa/check-declared-imports.mjs; echo EXIT=$?
[DECLARED IMPORTS] FAIL — bare imports missing from package.json:
  @axe-core/playwright  <- tests/e2e/axe-a11y.test.ts
EXIT=1
```

After:

```
$ npm install --save-dev @axe-core/playwright@^4.11.0
declared= ^4.14.0   installed= 4.14.0
package.json: +1 line, package-lock.json: +17 lines

$ node scripts/qa/check-declared-imports.mjs
[DECLARED IMPORTS] PASS — 391 files scanned, every bare import declared.
```

The gate is now a CI step (`npm run check:imports`) placed immediately after `npm ci`.

## 3. TS7006

`TS7006` at `axe-a11y.test.ts:19` (`v => v.impact`) disappeared once `@axe-core/playwright`
was declared: with real `AxeResults` types available, `v` is inferred. No `any` was added.

```
$ npm run typecheck
> tsc --noEmit
EXIT=0
```

## 4. quiz.wrongAnswers nondeterminism — failed before the fix

Root cause, confirmed this session:

```
$ curl -s --max-time 3 http://localhost:11434/api/tags
OLLAMA_REACHABLE
{"models":[{"name":"gemma2:2b", ...
```

`PipelineExecutor` calls `retrieveRelevantChunks`, which uses the vector RPC when
`generateEmbedding` returns a vector and an `ilike` fallback when it returns null. The test
stubbed only `match_document_chunks`; on CI (no Ollama) retrieval fell back to an empty
`document_chunks` table, the honesty guard returned `options: []`, and the assertion failed.
A shared module-level memory cache (`lib/cache.ts:62`) keyed only by kind/canonical-id/score
was a second source of cross-test state.

Regression test written first, run against the unfixed code with `generateEmbedding` forced
to return null (CI condition):

```
$ npx vitest run -c vitest.config.js tests/flows/quiz.wrongAnswers.noOllama.test.ts
AssertionError: expected 0 to be greater than or equal to 2
 ❯ tests/flows/quiz.wrongAnswers.noOllama.test.ts:38:35
 Test Files  1 failed (1)       Tests  1 failed (1)
EXIT=1
```

Fix:
- `tests/flows/quiz.wrongAnswers.test.ts` and the regression test now stub the retrieval
  boundary (`vi.mock('../../lib/retrieval')`) so the premise "a note was ingested" holds on
  every machine, independent of Ollama.
- Both use `cache_policy: { mode: 'bypass', ttlSeconds: 0 }` so a prior test in the same
  worker cannot supply a cached answer.
- The regression test injects a deterministic AI router through the existing
  `PipelineExecutor` constructor seam; no real provider call can stall it.
- Added a second regression case proving the honest `notCovered` path when nothing matches.

After:

```
$ npx vitest run -c vitest.config.js tests/flows/quiz.wrongAnswers.test.ts tests/flows/quiz.wrongAnswers.noOllama.test.ts
 Test Files  2 passed (2)
      Tests  7 passed (7)
EXIT=0
```

## 5. Global timeout reverted

`vitest.config.js` `testTimeout: 10000` removed; default 5 s restored. No per-test timeout
raise was substituted.

```
$ npm test
 Test Files  65 passed (65)
      Tests  372 passed (372)
   Duration  20.46s
EXIT=0
```

## 6. Fresh-copy proof — exact CI steps in order (after fix)

Copied the working tree to `/tmp/opencode/easytutor-ci-proof` excluding `node_modules`,
`dist` and `.git`, then ran `npm ci` and every step of `.github/workflows/ci.yml` in order.

```
$ cd /home/daniel-muhoro/workspace/projects/easytutor
$ rm -rf /tmp/opencode/easytutor-ci-proof && mkdir -p /tmp/opencode/easytutor-ci-proof
$ tar --exclude=node_modules --exclude=dist --exclude=.git -cf - . | tar -xf - -C /tmp/opencode/easytutor-ci-proof
$ cd /tmp/opencode/easytutor-ci-proof
$ node -e "console.log('PKG='+require('./package.json').name)"
PKG=easytutor
```

Each step below is a real command whose exit code was captured; the tail is copied from
`/tmp/wave1-fresh-proof.log`.

| Step (in `.github/workflows/ci.yml` order) | STEP_EXIT | Output tail |
|---|---|---|
| `npm ci` | 0 | *(silent)* |
| `npm run check:imports` | 0 | `[DECLARED IMPORTS] PASS — 391 files scanned, every bare import declared.` |
| `npm run typecheck` | 0 | `> tsc --noEmit` |
| `npm run lint` | 0 | `✖ 190 problems (0 errors, 190 warnings)` |
| `npm test` | 0 | `Tests 372 passed (372)`, `Duration 34.19s` |
| `npm run lint:cycles` | 0 | `x 13 dependency violations (0 errors, 13 warnings). 328 modules, 1195 dependencies cruised.` |
| `node scripts/architecture/validate_boundaries.js` | 0 | `[AUDIT PASSED] No architecture violations found.` |
| `npm run guard:secret-exposure` | 0 | *(passed)* |
| `npm run guard:public-env` | 0 | `Public env guard passed: 2 EXPO_PUBLIC_* name(s) checked against the allowlist.` |
| `node scripts/qa/qa_runner.js` | 0 | `[QA] SUCCESS: Flow Tests` / `[QA] All systems verified. Ready for release.` |
| `npm run build` | 0 | `Exported: dist` / `[PWA] injected manifest link + service-worker registration into dist/index.html` |
| `npm run perf:budget` | 0 | `gzip 443496 B (budget 450000 B)`, `raw 1701926 B (budget 1750000 B)`, `route chunks 38 (minimum 30)`, `PASS` |

`DONE` is the last line of the log: every CI step ran to completion with exit 0 on a copy with
no `node_modules`, no `dist` and no `.git`. The earlier bogus run (which produced
`easytutor-walkthrough@1.0.0 test → no test specified`) came from copying the wrong working
directory and was discarded; the valid run is the one above (`PKG=easytutor`).
