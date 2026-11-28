# Sprint 92 — Home "Ask question" → real tutor session (red/green)

**Date:** 2026-11-28 · **Base:** `main` `fccca43` · **Spec:**
`sprints/sprint_92_stitch_incoming_and_tutor_handoff.md`

## Real path under test

`screens/tabs/index.tsx` renders the Stitch Home quick actions. The "Ask a
question" action previously called `router.push('/(tabs)/study')`. The Stitch
Home reference places this action at the entry to a tutor session with a stage
stepper and governed citations; the app already has that exact, tested surface at
`app/tutor/session.tsx` → `screens/tutor/session.tsx`, but Home could not reach
it.

## Red — before the fix

Command: `npx vitest run tests/screens/home-today.test.tsx`

```
AssertionError: expected "vi.fn()" to be called with arguments: [ '/tutor/session' ]

Received:
  1st vi.fn() call:
  [
-   "/tutor/session",
+   "/(tabs)/study",
  ]

 Test Files  1 failed (1)
      Tests  1 failed | 8 passed (9)
```

## Change

`screens/tabs/index.tsx`, one line only: the `askTutor` quick action now calls
`router.push('/tutor/session')`. The other two actions, all layout, copy, data
flow, caps, budgets, thresholds and existing test assertions are unchanged.

## Green — after the fix

Command: `npx vitest run tests/screens/home-today.test.tsx`

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

The new test presses the real rendered button in the real Home component and
asserts the router call. The dedicated route itself is independently proven by
`tests/screens/phase2-tutor-session.test.tsx`, which mounts `app/tutor/session.tsx`
and verifies governed cited answers and the honest no-sources refusal.

## Full local gate

After the change: typecheck 0 errors, lint 0 errors (131 pre-existing warnings),
`npm test` 119 files / 633 tests, boundaries 0 violations, QA verified,
readiness unchanged, `npm run build` exit 0, `npm run e2e:full` 5/5 against the
real local Supabase stack. The worktree needed its own gitignored `.env.local`
copy for the e2e harness; no credential value was written to a tracked file.

## Governance

- No readiness row promoted; no gate file fabricated.
- No matcher, timeout, threshold, cap or budget changed to obtain the green.
- No secret, token, credential, learner datum or Stitch key in this change.
- `README.md` describes the new handoff in the same change.
