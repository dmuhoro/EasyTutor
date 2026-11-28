# Sprint 86 — repeated `Flagship learning` boot stall on `main`

**Spec:** `sprints/sprint_86_pilot_ready.md` §9 stop condition.
**Status:** INVESTIGATED, NOT FIXED, NO ROW PROMOTED ON THIS EVIDENCE.

## Observed failure

The same assertion failed twice on `main` on two SHAs whose PR heads were green:

- run `46064998039` attempt 2, SHA `c3af3cb`
- run `46066133317` attempt 1, SHA `79e6c12`

Assertion `tests/e2e/coreLoop.demo.spec.ts:227`
`getByText('Flagship learning', { exact: true })` after `page.goto(APP_ORIGIN + '/')`
timed out after the unchanged 15 s. The Playwright error-context artifact
(run `46066133317`, artifact `15231246446`) contained exactly one element:

```yaml
- progressbar "Loading EasyTutor"
```

The app was still on `AppSkeleton` for the whole window. The text is rendered at
`screens/tabs/index.tsx:691` as `t('flagshipLearning')`, and the same assertion
at line 211 passed in both failing runs. This is therefore a boot-path stall,
not a stale matcher. No timeout, matcher, retry count, assertion or test was
relaxed in response.

## Real boundary inspected

`app/_layout.tsx` computes
`resolveBootState({ authLoading, profileLoading, fontsSettled }, hasBootstrapped)`.
`isProfileLoading` starts `true` and is cleared by the `onAuthStateChange`
callback or the `finally` of `syncProfile`. `syncProfile` calls a 3-attempt
`retry()` with no per-attempt timeout, so a pending auth/DB request can hold the
skeleton open indefinitely. `docs/evidence/wave1-5-demo.md` already records an
open bootstrap defect on the same path (`[PROFILE FATAL] Error: Max retries
reached` and a "Profile sync failed" banner).

This failure shape is also recorded historically: Sprint 84 needed one
`real-stack` rerun on both exact SHAs after an intermittent boot stall, and
Sprint 77 was rejected after three attempts stuck at `Loading EasyTutor`.

## Controls

1. Real exported `dist/` + real local Supabase at pinned port 54331 + 390 px
   Playwright (`npm run e2e:full`): **4/4 pass** in 12.5 s.
2. Fail-closed repeat, 10 consecutive local real-stack runs, no retry and no
   relaxed matcher: **10/10 pass**, durations 10.4–14.0 s, `EXIT=0`.
3. PR #72 head `db80578` full CI run `46128711026`: `build`, `RLS matrix` and
   `Real stack` all success on an identical tree.
4. Next full `main` CI on merge SHA `5d643f0acf30aba6a001b640c540b8fa9cefbf24`,
   run `46129002216`: all three jobs success, including `Real stack`.

## Honest classification

Not reproduced in 11 local runs, on the PR-head CI run or on the subsequent
green `main` CI run. It remains an **intermittent real-stack boot stall of
unknown root cause**. No product fix is claimed and no row is promoted on this
evidence. If it recurs, the next change is a bounded boot/profile-sync deadline
at the real boot boundary, with a fail-first test, explicit failure banner and
its own spec/evidence — never a longer test timeout or a weaker assertion.
