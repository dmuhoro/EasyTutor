# Sprint 87 — bounded first-paint deadline (spec, written before code)

**Date:** 2026-11-28 EAT
**Trigger:** Sprint 86 §9 stop condition reached. The same real-stack CI failure
(`tests/e2e/coreLoop.demo.spec.ts:227`, app stuck on `Loading EasyTutor`) has now
occurred three times: runs `46064998039` attempt 2, `46066133317` attempt 1 and
`46130220972` (docs-only PR #73, identical product tree to green `main` run
`46129002216`).

## 1. Problem at the real boundary

`app/_layout.tsx` renders `AppSkeleton` while
`resolveBootState({ authLoading, profileLoading, fontsSettled }, hasBootstrapped)`
reports not ready. `authLoading` is cleared by the module-load
`supabase.auth.getSession()` in `store/authStore.ts`; `profileLoading` is
cleared by `onAuthStateChange` / `syncProfile`, whose 3-attempt `retry()` has no
per-attempt timeout. Either network input can therefore hold first paint
indefinitely. The Playwright error context from all three failures contains
only `progressbar "Loading EasyTutor"`, so the shell never rendered.

This is a product fail-open: an unavailable or slow auth/profile request leaves
the learner on a permanent skeleton with no explicit failure state. The
existing 1 s font grace window shows the correct pattern for a non-critical
boot input.

## 2. Change (no test or threshold weakened)

1. `lib/boot.ts` gains an optional `loadingDeadlineExpired` input and an
   exported `BOOT_LOADING_TIMEOUT_MS = 5000`. When the deadline flag is true,
   `isBootReady` may become true even if auth/profile are still pending. Fonts
   keep their own unchanged 1 s grace. The existing latch semantics are not
   altered.
2. `app/_layout.tsx` arms one mount-time timer for `BOOT_LOADING_TIMEOUT_MS`.
   On expiry it reads the *current* loading flags from a ref; if either is
   still true it sets the deadline flag, sets an explicit `profileError`
   banner ("Session or profile sync timed out. Using offline defaults.") and
   emits a `WARN` `boot_loading_timeout` event. No silent drop: the learner and
   the log both see that sync did not complete.
3. Two fail-first tests in `tests/boot/readiness.test.ts` prove the deadline
   opens the shell for pending auth and for pending profile, and that a normal
   settle still behaves as before. The exact unit/test ratchet moves only by
   the exact number of tests added; no matcher, timeout, assertion or budget is
   relaxed.

## 3. Red control

Before the fix, run the two new tests against byte-for-byte `main` `lib/boot.ts`:
they must fail with `isBootReady === false`. Capture raw output at
`docs/evidence/S87-red.txt`. Restore the original file hash, then apply the
fix and capture green output at `docs/evidence/S87-green.txt`.

## 4. Proof required before any row moves

- Local full gate: typecheck 0, lint 0 errors, exact new test count, boundaries
  0 violations, QA all systems verified, web export, `perf:budget` and
  `perf:login-route` under unchanged budgets.
- A pushed PR head with green `build`, `RLS matrix` and `Real stack`.
- A green `main` CI on the exact merge SHA, including `Real stack`.
- Only then may a readiness row be promoted, and only with those run URLs.

## 5. Non-goals

No change to Playwright's 15 s expect timeout, retry count, matcher or assertion.
No claim that the stalled CI environment is fixed. No readiness row promoted on
local proof alone. No version bump or tag in this change.
