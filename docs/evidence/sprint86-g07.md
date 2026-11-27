# Sprint 86 — G-07 evidence

**Spec:** `sprints/sprint_86_g07_production_mock.md` (parent `sprints/sprint_86_pilot_ready.md`)
**Status:** LOCAL GREEN · **no row promoted** · promotion requires exact pushed green CI.

## Real boundary

`src/infrastructure/database/index.ts` `Database.getClient()` used to return
`globalThis.__MOCK_SUPABASE_CLIENT__` before checking the real client. The
global is installed for every test by `tests/setup.ts:56`, so the production
governance path could be served by a test double. This is the exact insertion
point fixed; no new helper was introduced.

## Pre-registered red control

New test in `tests/flows/database.governance.test.ts` injects a sentinel mock,
stubs `NODE_ENV=production` and clears `VITEST`, then asserts a
`BackendUnavailableError`. Command:

```
npx vitest run -c vitest.config.js tests/flows/database.governance.test.ts
```

Result on the unmodified boundary (log `docs/evidence/G-07-red.txt`):

```
❯ tests/flows/database.governance.test.ts (5 tests | 1 failed) 36ms
  × refuses an injected mock client when the runtime is production
AssertionError: expected [Function] to throw an error
Test Files  1 failed (1)
     Tests  1 failed | 4 passed (5)
EXIT=1
```

## Implementation

- `Database.getClient()` resolves the runtime at call time. Production refuses
  an injected mock and a missing real client with a typed
  `BackendUnavailableError` (`[BACKEND UNAVAILABLE]`). Test runtime keeps the
  existing seam; `EASYTUTOR_ALLOW_MOCK=1` is honoured only in development.
- No `any` was added; the global holder is typed.
- `components/GlobalErrorBoundary.tsx` is now an accessible blocking service
  unavailable surface: `accessibilityRole="alert"`, "Service unavailable"
  title, and an accessible Retry control. Existing copy was shortened rather
  than adding new strings, so the unchanged 450,000 B entry budget still fits.
- `AGENTS.md`, `README.md` and the CI suite-count grep in
  `.github/workflows/ci.yml` were updated to 118 files / 624 tests in the same
  change because two tests were added. No threshold was loosened.

## Green control

Same targeted command on the fixed tree (log `docs/evidence/G-07-green.txt`):

```
Test Files  1 passed (1)
     Tests  5 passed (5)
EXIT=0
```

## Budget controls (unchanged 450,000 B entry budget)

Measured with Node 22.13 and `CI=true`, build then `npm run perf:budget`:

| Tree | gzip | Result |
|---|---:|---|
| baseline `v1.16.7` (recorded) | 449,926 / 450,000 B | PASS |
| first fix attempt with new UI strings | 450,099 / 450,000 B | FAIL (pre-registered; rejected) |
| shortened fix, UI reverted for isolation | 450,007 / 450,000 B | FAIL (pre-registered; rejected) |
| final fix + reused UI copy | **449,985 / 450,000 B** | **PASS** |

Raw 1,700,128 / 1,750,000 B; 39 / 30 route chunks. `npm run perf:login-route`
also passed in the full gate below. No budget file was edited.

## Full local gate

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / 129 warnings |
| `npm test` | 118 files / 624 tests passed |
| `npm run check:i18n` | 82 files, 0 violations |
| `node scripts/design/check-no-raw-hex.mjs` | PASS |
| `npm run readiness:check` | 153 rows valid; generated file current |
| imports / AI boundary / architecture / governance / cycles | PASS |
| secrets / QA / audit / build / dist guard | PASS |
| `npm run perf:budget` | 449,985 / 450,000 B PASS |
| `npm run perf:login-route` | PASS |
| `npm run e2e:smoke` | 9 / 9 |
| `npm run e2e:full` | 4 / 4 |
| `npm run test:e2e:a11y` | 4 / 4 |

Logs: `/tmp/opencode/sprint86-prB-*.txt` and
`audits/full-audit-2026-11-27_*.txt`.

## Promotion condition

`G-07` is still `NOT DONE` in `docs/COMPLETION_TRACKER.md`; no readiness row is
promoted by this code change. Promotion happens only in a separate docs change
after the exact pushed green CI run on this code head, citing its SHA and run URL.
