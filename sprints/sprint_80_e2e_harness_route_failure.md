# Sprint 80 — Real-stack harness must not hang on a failed route fetch

## Spec and real boundary

PR #53 (`docs/decision-packets`, head `b313240`) is docs-only, yet pushed CI run
`45840295266` failed the `Real stack (Supabase CLI + full e2e)` job on test 3,
`deletion of the Learn screen with a free-form topic`. The error context showed
only `progressbar "Loading EasyTutor"` — the app never left `AppSkeleton`.

The real failure boundary is the harness, not the product gate:

- `tests/e2e/coreLoop.demo.spec.ts:83-88` installs a Playwright route that calls
  `route.fetch({ url: realUrl })`. If that call throws (locally reproduced as
  `route.fetch: Request context disposed`), the handler exits without calling
  `route.fulfill()` or `route.abort()`. The browser request stays pending.
- `store/authStore.ts:167-183` awaits `client.auth.getSession()` on module load,
  and `app/_layout.tsx:103-155` awaits the governed profile query. Both waits are
  unbounded. A pending Supabase request therefore keeps `isLoading` /
  `isProfileLoading` true forever, so `resolveBootState` never settles and the
  skeleton never unmounts.
- This is the same symptom as E11 spike attempt 2 on run `45775046681`, and it
  is independent of product code: a docs-only head reproduced it.

No assertion, timeout, matcher or acceptance command is changed by this slice.
The 15 s visibility expectation stays exactly as written. The fix makes a
failed upstream fetch *fail fast* so the app's existing error handling can run,
instead of silently hanging the real-path proof.

## Change surface

1. `tests/e2e/coreLoop.demo.spec.ts`: wrap the rewrite fetch in try/catch; on
   failure call `await route.abort('failed')` and count the failure. Do not
   swallow the test's own assertions.
2. `tests/e2e/coreLoop.demo.spec.ts`: clear routes in `afterAll` with
   `page.unrouteAll({ behavior: 'ignoreErrors' })` so in-flight callbacks cannot
   outlive the context.
3. Evidence: red control, green control and the exact pushed CI run.

## Red control (pre-registered)

Temporarily make the rewrite handler throw on `/auth/v1/user` with no catch.
`npm run e2e:full` must fail to reach the Learn screen within the unchanged
15 s expectation, with the app stuck on `Loading EasyTutor`. Restore the file
byte-for-byte (SHA-256 verified), then apply the fix; the same suite must be
green with the same assertion and timeout.

## Non-goals (hard)

- No product code change; no `app/`, `lib/`, `store/` or `src/` edit.
- No change to `playwright.demo.config.js`, test timeout, expect timeout,
  retries, worker count, or any assertion.
- No readiness row promotion, no version/tag change.
- No secret is printed. The harness continues to read `.env.local` without
  logging values.

## Verification

- Red control observed and recorded; product/harness file hashes restored.
- `npm run e2e:full` green locally (3/3).
- Full local gate green, including the unchanged suite-count gate.
- Pushed CI green on the exact branch head; the run URL recorded in evidence.
- Only after that run is the fix merged to `main`, and PR #53 re-proved on its
  exact head before merge.
