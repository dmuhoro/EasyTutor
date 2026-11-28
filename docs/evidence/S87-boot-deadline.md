# S87 — bounded first-paint deadline

**Spec:** `sprints/sprint_87_boot_deadline.md` (written before code).
**Status:** LOCAL GREEN · CI PROOF PENDING · no readiness row promoted here.

## Trigger

Sprint 86 §9 stop condition: the same real-stack failure
(`tests/e2e/coreLoop.demo.spec.ts:227`, app stuck on `Loading EasyTutor`) occurred
three times — runs `46064998039` attempt 2, `46066133317` attempt 1 and
`46130220972` (docs-only PR #73 with a product tree identical to green `main`
run `46129002216`). In every case the Playwright error context contained only
`progressbar "Loading EasyTutor"`.

## Real boundary inspected

`app/_layout.tsx` renders `AppSkeleton` while
`resolveBootState({ authLoading, profileLoading, fontsSettled }, hasBootstrapped)`
is not ready. `authLoading` is cleared by module-load `supabase.auth.getSession()`
in `store/authStore.ts`; `profileLoading` is cleared by `onAuthStateChange` /
`syncProfile`, whose three-attempt `retry()` has no per-attempt timeout. Either
network input can hold first paint indefinitely. This is an unbounded fail-open
at the real boot boundary, not a matcher problem.

## Change

- `lib/boot.ts`: exported `BOOT_LOADING_TIMEOUT_MS = 5000` and optional
  `loadingDeadlineExpired` input. `isBootReady` now treats auth/profile as
  settled when the deadline flag is true. Font grace and the existing latch are
  unchanged.
- `app/_layout.tsx`: one mount-time timer; on expiry it reads the *current*
  flags from a ref, sets the deadline flag, sets the learner-visible
  `profileError` banner ("Session or profile sync timed out. Using offline
  defaults.") and emits `WARN boot_loading_timeout` with the pending flags.
- No Playwright timeout, matcher, retry count, assertion or test was weakened.
  The exact suite ratchet moved by exactly the two tests added:
  `119 files / 630 tests` → `119 files / 632 tests` in `AGENTS.md` and the CI
  grep, in the same change.
- `README.md` describes the new bounded boot behaviour.

## Red control before green

New tests were added first and run against byte-for-byte `main` `lib/boot.ts`
(hash `99f321c8767a6a8daa0a47ae560c0b80a096b851f729d8275292558ccaf38aed`):

```
Test Files  1 failed (1)
     Tests  2 failed | 6 passed (8)
```

Raw output: `docs/evidence/S87-red.txt`. After the fix the same file reports
`1 passed (1)` / `8 passed (8)`; raw output: `docs/evidence/S87-green.txt`.

## Local gate on the fixed tree

typecheck 0 errors · lint 0 errors (129 pre-existing warnings) ·
119 files / 632 tests · boundaries 0 violations · QA all systems verified ·
web export OK · perf budget `1,701,830 / 1,750,000 B` PASS · login route
`675,749 / 733,000 B` PASS. No budget or threshold was changed.

## Not claimed

This change is not claimed to fix the CI environment; it bounds the product's
response to it. No readiness row is promoted from this local evidence. CI proof
requires a green pushed PR head and a green `main` run on the exact merge SHA,
including the real-stack job.
