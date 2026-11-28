# Sprint 95 — honest offline state in the tutor session (red/green)

**Date:** 2026-11-28 · **Base:** `main` `e01a7f7` · **Spec:**
`sprints/sprint_95_tutor_offline_honesty.md`

## Real path under test

The real `/tutor/session` route showed `t('offlineMessages')` whenever NetInfo
reported no connection. That shared key says "Messages will send when you
reconnect." It is accurate in `screens/tabs/study.tsx`, which owns the persisted
offline queue, but false in the tutor session: its input and send control are
disabled offline and it neither enqueues nor replays anything. The test mounts
the real route with NetInfo offline and reads the rendered tree.

## Red — before the fix

`npx vitest run tests/screens/phase2-tutor-session.test.tsx`

```
 FAIL  ... > tells the truth when offline: no queued-delivery claim and sending disabled
AssertionError: expected '{"type":"SafeAreaView","props":{"clas…' to contain
'You're offline. Reconnect to ask the tutor…'

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
```

## Change

`screens/tutor/session.tsx` now uses a tutor-specific `t('tutorOfflineBanner')`.
The new en/sw/fr string states that the learner is offline, must reconnect to
ask, and that grounded answers need uploaded notes. No queue claim, no draft id
or reset time invented. The study tab keeps its accurate queue banner and its
behaviour byte-identical.

## Green — after the fix

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

The test also asserts the false queue sentence is absent and the send control is
disabled. Existing cited-answer, back, daily-limit and not-in-notes tests are
unchanged and green.

## Full local gate

Typecheck 0 errors, lint 0 errors, `npm test` 119 files / 637 tests, boundaries
0 violations, QA verified, readiness unchanged, web export OK, `e2e:full` 5/5
against the real local Supabase stack.

## Governance

- No readiness row promoted; no gate file fabricated.
- No matcher, timeout, threshold, cap or budget changed.
- No secret, token, credential or learner datum in the change.
- README, STATUS and CHANGELOG move with the behaviour.
