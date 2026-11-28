# Sprint 94 — honest daily-limit refusal in the tutor path (red/green)

**Date:** 2026-11-28 · **Base:** `main` `9e41bad` · **Spec:**
`sprints/sprint_94_daily_limit_honest_state.md`

## Real boundary under test

`supabase/functions/ai-proxy/handler.ts:98` enforces the per-learner daily cap
with an atomic RPC and returns `429` + `{"error":"daily AI call limit exceeded"}`.
Before this change `lib/ai/providers.ts:callAIProxy` discarded that body and
threw a **retryable** generic 429, so `lib/ai/reliability.ts` called the capped
proxy again, then fell back to placeholder. `screens/tutor/session.tsx` rendered
that failure as an assistant bubble with a source label — a misleading answer
where the learner needed a clear refusal.

## Red — before the fix

`npx vitest run tests/flows/aiProviderBoundary.m1.test.ts tests/screens/phase2-tutor-session.test.tsx`

```
 FAIL  ... > does not retry a daily-cap 429: one call, explicit DAILY_LIMIT refusal
AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times

 FAIL  ... > shows an honest daily-limit refusal with an offline-practice handoff
AssertionError: expected undefined to be defined

 Test Files  2 failed (2)
      Tests  2 failed | 11 passed (13)
```

## Change (real path only)

1. `lib/ai/providers.ts`: parse the proxy's JSON refusal reason (never log or
   echo the body), recognise the exact server message and throw a typed
   `DailyLimitError` with `retryable = false`. Other 429s keep the existing
   retryable classification.
2. `lib/ai/reliability.ts`: carry an optional `errorCode` on the result, set
   `DAILY_LIMIT` on the typed failure and record it in the existing `logAICall`
   audit row (`error_code`). No new rail, no retry, no cap/budget change.
3. `lib/api.ts`: propagate `errorCode` through `askTutor`.
4. `screens/tutor/session.tsx`: on `DAILY_LIMIT`, emit **no** assistant message,
   source label or citation; show an honest state with a real handoff to the
   quiz route. `components/ui/EmptyState.tsx`: give that action an explicit
   button role and label so it is reachable and testable. Three new strings
   added to en/sw/fr together (locale parity gate stayed green).

## Green — after the fix

```
 Test Files  2 passed (2)
      Tests  13 passed (13)
```

The boundary test drives the real `callAIProxy` → `executeWithReliability` chain
with only `fetch` substituted: exactly **one** proxy call, `errorCode ===
'DAILY_LIMIT'`, honest copy, no "busy right now". The route test mounts the real
`app/tutor/session.tsx` and asserts no `Answered by:` label plus an action that
navigates to `/(tabs)/quiz`. Existing transient 429/503 retry tests remain
byte-identical and green.

## Full local gate

Typecheck 0 errors, lint 0 errors (129 pre-existing warnings), `npm test` 119
files / 636 tests, boundaries 0 violations, QA verified, readiness unchanged,
web export OK, `e2e:full` 5/5 against the real local Supabase stack.

## CI proof

- PR head `7a1d587`: CI `46168011369` fully green on `build`, `RLS matrix` and
  `Real stack`.
- Merge on `main` `ffa5644`: CI `46168398065` fully green on the same three jobs.

## Governance

- No readiness row promoted; no gate file fabricated.
- No matcher, timeout, threshold, cap or budget changed to obtain the green.
- No secret, token, credential, learner datum or raw error body in the change.
- README, STATUS and CHANGELOG move with the behaviour.
