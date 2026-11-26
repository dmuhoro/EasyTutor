# Sprint 80 evidence — harness must not leave a failed route pending

**Date:** 2026-11-26 · **Branch:** `fix/e2e-harness-route-failure` · **Spec:** `sprints/sprint_80_e2e_harness_route_failure.md`

## Exact failure this slice addresses

Docs-only PR #53 head `b313240` failed the `Real stack (Supabase CLI + full e2e)`
job on pushed run `45840295266`, job `139979856070`:

- Test 3 `deep link renders the wired Learn screen with a free-form topic`
  (`tests/e2e/coreLoop.demo.spec.ts:204`) timed out after the unchanged 15 s
  expectation on `getByText('Learn').first()`.
- The Playwright error context contained only
  `progressbar "Loading EasyTutor"` — `AppSkeleton` never unmounted.
- Tests 1 and 2 passed. The `build` and `RLS matrix` jobs passed. A docs-only
  change cannot alter app boot, so this is not a product regression from PR #53.
- The same symptom appeared on E11 spike attempt 2 of run `45775046681`.

Root cause at the real boundary: `installHarness` in
`tests/e2e/coreLoop.demo.spec.ts` rewrote Supabase requests with
`route.fetch()`. When that call throws (locally reproduced as
`route.fetch: Request context disposed`), the handler previously exited without
`route.fulfill()` or `route.abort()`. The browser request stayed pending, so the
unbounded `getSession()` / governed-profile waits in `store/authStore.ts` and
`app/_layout.tsx` never settled.

## Red control (before fix)

Temporarily forced a throw on `/auth/v1/user` inside the rewrite handler with
no catch, then ran `npm run e2e:full`:

```
1 failed, 2 did not run
Error: E2E RED CONTROL: forced route fetch failure
```

The file was then restored byte-for-byte and verified by SHA-256
(`88f574c102e2223a782ebb085041f8542bb95d4cf49e75e0d59f273f67e6ee44`).
No test, timeout, matcher or assertion was changed for the control.

## Fail-fast control (after fix)

With the try/catch/abort fix applied, the same forced failure was injected
inside the `try`. The suite no longer hung on the skeleton; it failed explicitly
at the unchanged real assertion `profileRow(email)` after the unchanged 15 s
poll, with no unhandled route error:

```
1 failed, 1 did not run, 1 passed
expect(received).toMatchObject(expected) ... Timeout 15000ms exceeded
```

The forced injection was removed and the fixed file restored byte-for-byte
(SHA-256 verified before the final run).

## Fix

- `tests/e2e/coreLoop.demo.spec.ts:83-95` — catch a failed upstream fetch and
  call `route.abort('failed')`; count it in `counters.routeFailures`.
- `tests/e2e/coreLoop.demo.spec.ts:129` — `page.unrouteAll({ behavior: 'ignoreErrors' })`
  in `afterAll` so in-flight route callbacks cannot outlive the context.
- No product file changed. No timeout, retry, worker count, matcher, assertion
  or acceptance command changed. `playwright.demo.config.js` is untouched.

## Green control

```
$ npm run e2e:full
  ✓ sign-up through the real UI creates a session and lands on onboarding (2.6s)
  ✓ setup wizard advances one step at a time, persists under RLS and survives reload (3.4s)
  ✓ deep link renders the wired Learn screen with a free-form topic (1.4s)
  3 passed (14.4s)
```

## Full local gate (green)

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / 129 warnings (pre-existing) |
| `npm test` | 115 files / 614 tests passed (unchanged suite count) |
| Architecture / governance / imports / AI boundary | all PASS |
| `npm run build` | exit 0, 1691 modules, 41 JS bundles |
| `npm run perf:login-route` | 666,978 / 733,000 B PASS (unchanged) |
| `node scripts/qa/qa_runner.js` | all systems verified |
| `npm run readiness:check` | 153 rows, scores unchanged, all `READY=NO` |
| `npm run guard:secrets`, `npm run guard:dist` | PASS |
| `npm audit --omit=dev --audit-level=critical` | 0 critical advisories |
| `npm run lint:cycles` | 0 errors / 13 pre-existing warnings |
| `npm run perf:budget` | gzip 437,859 / 450,000 B, raw 1,674,508 / 1,750,000 B PASS |
| `npm run e2e:smoke` | 9 passed |
| `npm run e2e:full` | 3 passed (10.2 s) |

No readiness row was promoted and no version/tag changed.

## CI proof

Harness code head `0b59abaee3efffa448cb72a3ffedf2c10f983ab2` (PR #54) was green
in all three jobs on pushed run
https://github.com/dmuhoro/EasyTutor/actions/runs/45842917459.

After the evidence/STATUS/CHANGELOG text was added, the final branch head
`fd587b6b623926f1c9ad1ac4a30b75f0128f46d6` was re-proved green in all three
jobs on pushed run
https://github.com/dmuhoro/EasyTutor/actions/runs/45843745769:

| Job | Result |
|---|---|
| Real stack (Supabase CLI + full e2e) | PASS |
| RLS matrix (247 assertions, fail closed) | PASS |
| build (typecheck, lint, tests, audits, budgets, smoke) | PASS |

The full local gate was green before both pushes, and each exact pushed head is
green in all three jobs. No readiness row was promoted and no version/tag
changed by this harness slice.
