# Sprint 94 — honest daily-limit state in the tutor path

**Date:** 2026-11-28 · **Base:** `main` `9e41bad` · **Type:** fail-closed core-loop
correction from the Stitch tutor-limit friction reference.

## Trigger

The real proxy (`supabase/functions/ai-proxy/handler.ts:98`) enforces the daily
cap atomically and returns HTTP 429 with body
`{"error":"daily AI call limit exceeded"}`. The client throws that body away:
`lib/ai/providers.ts:callAIProxy` converts every 429 into a **retryable**
`ProviderHttpError` with the copy "busy right now, we will retry shortly".
`lib/ai/reliability.ts` then retries twice, calling the capped proxy again on
each attempt, and finally falls back to placeholder. `screens/tutor/session.tsx`
renders that failure as an assistant chat bubble with a source label, implying
the tutor answered. No learner sees that their daily allocation is exhausted,
and no offline-practice handoff is offered. The Stitch reference
`state_tutor_limit_reached` defines exactly this friction state.

## Spec

1. **Real boundary first.** In `lib/ai/providers.ts`, read the proxy's error
   body, recognise the exact daily-limit message and throw a typed,
   **non-retryable** `DailyLimitError` with honest copy. Other 429s keep the
   existing retryable behaviour. No key, token or body is logged.
2. **Preserve the reason.** Add an optional `errorCode` to `ReliabilityResult`
   and `AIResponse`; set `DAILY_LIMIT` on the typed failure, record it in the
   existing `logAICall` audit row, and propagate it through `askTutor`. No new
   fallback rail, no cap or budget change.
3. **Fail closed in the UI.** In `screens/tutor/session.tsx`, when the governed
   response reports `DAILY_LIMIT`, do not add a fabricated assistant answer.
   Show an honest state with a "Switch to offline practice" action that opens
   the real quiz route. Add the three user-facing strings to en/sw/fr packs.
4. **Proof exercises the real path.**
   - A boundary test drives the real `callAIProxy` → `executeWithReliability`
     chain with only `fetch` mocked. It must be **red** before the fix (3 proxy
     calls, no error code) and **green** after (1 proxy call, `DAILY_LIMIT`,
     honest copy).
   - A real-route test mounts `app/tutor/session.tsx`, makes `askTutor` return
     the daily-limit failure, and asserts the honest state and its action. It
     must be red before the fix.
5. Full local gate green. Update `README.md`, `STATUS.md` and `CHANGELOG.md` in
   the same change. Record CI proof separately after green head and green
   `main` runs. No readiness row promoted, no threshold or matcher weakened.

## Acceptance

- A daily-limit 429 produces exactly one proxy call and an explicit refusal.
- Transient 429/503 retry behaviour and its existing tests are unchanged.
- No assistant message, source label or citation is emitted for a refused call.
- Locale parity (en/sw/fr) and the shipped-screen literal scanner stay green.
