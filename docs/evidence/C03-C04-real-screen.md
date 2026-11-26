# C03 + C04 — real-screen onboarding/setup proof (Sprint 78)

## False acceptance corrected

`C03` (onboarding handoff to setup wizard) and `C04` (7-step setup wizard) were
`IMPLEMENTED-UNPROVEN` with acceptance `npm run test:auth-flow`. That suite
exercises auth redirects only; `tests/flows/onboarding.flow.test.ts` simulates
store/DB writes without rendering either screen. This was already recorded in
`docs/evidence/closure-verified-rows.md:28-32`.

The real boundary is:

- `screens/onboarding.tsx:50-66` — `handleGetStarted` calls `router.replace` to
  `/setup-wizard` with the selected mode.
- `screens/setup-wizard/index.tsx:69-80` — seven ordered steps plus `done`.
- `screens/setup-wizard/index.tsx:112-116` — `nextStep` advances one step.
- `screens/setup-wizard/index.tsx:140-189` — governed profile write, local
  preferences and onboarding completion.
- `tests/e2e/coreLoop.demo.spec.ts:131-202` — real Chromium at 390 px against
  the real local Supabase stack on `:54331`.

The acceptance command for both rows is now `npm run e2e:full`, the exact
command the CI `real-stack` job runs.

## Trustworthy baseline

Real stack pinned to `:54331`; `supabase db reset --no-seed` succeeded;
`npm run build` succeeded; then:

```text
Running 3 tests using 1 worker

  ✓  1 ...sign-up through the real UI creates a session and lands on onboarding (1.5s)
  ✓  2 ...setup wizard advances one step at a time, persists under RLS and survives reload (2.4s)
  ✓  3 ...deep link renders the wired Learn screen with a free-form topic (734ms)

  3 passed (8.2s)
```

## Negative controls on the real boundary

Each control mutated a tracked product file, rebuilt, ran `npm run e2e:full`
against the real stack, failed at the expected assertion, then restored the
file byte-for-byte. SHA-256 restoration was verified with `sha256sum -c`.

### C03 handoff control

Mutation: `screens/onboarding.tsx` `router.replace({ pathname: '/setup-wizard',
params: { level: selectedMode } })` → `router.replace('/')`.

Before hash: `f4ce8df2227a7c077008a3bdc35f16f996ea18abdffc138149543a1ead0e569a`.
After restore: `screens/onboarding.tsx: OK`.

```text
✘  2 ...setup wizard advances one step at a time, persists under RLS and survives reload (15.2s)

Error: expect(page).toHaveURL(expected) failed
Expected pattern: /\/setup-wizard/
Received string:  "http://127.0.0.1:3002/onboarding"
Timeout: 15000ms

> 155 |     await expect(page).toHaveURL(/\/setup-wizard/);

1 failed, 1 did not run, 1 passed (20.3s)
```

This proves the gate detects a broken onboarding → setup-wizard handoff.

### C04 step control

Mutation: `screens/setup-wizard/index.tsx` `nextStep` was replaced with a no-op.

Before hash: `a8b979d1b8a94c43ec918cd1165ff3719089ae15fbff4729faefe8d28fc65101`.
After restore: `screens/setup-wizard/index.tsx: OK`.

```text
✘  2 ...setup wizard advances one step at a time, persists under RLS and survives reload (15.5s)

Error: expect(locator).toBeVisible() failed
Locator: getByText('2 · Your level')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

> 161 |     await expect(page.getByText('2 · Your level')).toBeVisible();

1 failed, 1 did not run, 1 passed (20.8s)
```

This proves the gate detects a wizard that fails to advance through seven
steps.

## Green proof on restored source

```text
Running 3 tests using 1 worker

  ✓  1 ...sign-up through the real UI creates a session and lands on onboarding (1.7s)
  ✓  2 ...setup wizard advances one step at a time, persists under RLS and survives reload (3.0s)
  ✓  3 ...deep link renders the wired Learn screen with a free-form topic (800ms)

  3 passed (9.0s)
```

No test, assertion, timeout, matcher, budget, threshold or product behavior
was changed. No env value, key, JWT or token-bearing URL was printed or
committed.

## CI status

Rows remained `IMPLEMENTED-UNPROVEN` until exact pushed run
`https://github.com/dmuhoro/EasyTutor/actions/runs/45780554213` (PR #52 head
`31302336a9b284f6048c26d1446382ac76c5d6e5`) concluded `success`. The `build`,
`RLS matrix` and `Real stack` jobs passed on that head; the Sprint 77
`Loading EasyTutor` flake did not recur. C03 and C04 are now `VERIFIED-IN-CI` on
that run only. Full job IDs and promotion scope are in
`docs/evidence/sprint78-ci-proof.md`.
