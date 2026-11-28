# Sprint 95 — honest offline state in the tutor session

**Date:** 2026-11-28 · **Base:** `main` `e01a7f7` · **Type:** false-claim fix from
the Stitch connection-error reference.

## Trigger

`screens/tutor/session.tsx` renders `t('offlineMessages')` whenever NetInfo
reports no connection. That shared key says "You're offline. Messages will send
when you reconnect." It is true for the study tab, which owns the persisted
offline queue. It is **false** for the tutor session: the input and send control
are disabled when `!isConnected`, and this screen neither enqueues nor replays
anything. A learner is told a protection exists where none does. The Stitch
`state_connection_error` reference makes the saved/retry behaviour explicit;
this layer makes the honest opposite explicit until a grounded offline queue
exists.

## Spec

1. Add a tutor-specific `tutorOfflineBanner` string to en/sw/fr that states the
   truth: offline, reconnect to ask, because grounded answers need uploaded
   notes. No queue claim, no invented draft id or reset time.
2. Use that key only in `screens/tutor/session.tsx`; leave the study tab's
   accurate queue banner untouched.
3. Add a real-route test that mounts `app/tutor/session.tsx` with NetInfo
   offline and asserts the honest banner, the absence of the false queue claim,
   and that the send control is disabled. It must be **red before** the change.
4. Full local gate green. README/STATUS/CHANGELOG move with the behaviour;
   CI proof recorded separately after green head and green `main`. No row
   promoted, no matcher or timeout weakened.

## Acceptance

- Offline tutor banner never claims queued delivery.
- Study tab offline queue copy and behaviour are byte-identical.
- Locale parity (en/sw/fr) and shipped-screen literal scanner stay green.
