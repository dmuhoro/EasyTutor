# Sprint 93 — visible back affordance in the tutor session

**Date:** 2026-11-28 · **Base:** `main` `156a78c` · **Type:** Stitch-parity core-loop fix.

## Trigger

Sprint 92 made Home's Stitch "Ask question" action open the real
`/tutor/session` route. The root stack hides all native headers
(`app/_layout.tsx:364`), and `screens/tutor/session.tsx` has no in-app back
control. The Stitch tutor-session references include a header `arrow_back`.
A learner who follows the new handoff therefore has no visible way back on a
touch device. This is a functional dead end, not a styling preference.

## Spec

1. Add a real-route test to `tests/screens/phase2-tutor-session.test.tsx` that
   finds the rendered back control and asserts it calls `router.back()`. It must
   be **red before** the change.
2. Add one accessible back control to the header row in
   `screens/tutor/session.tsx`, using the existing `t('back')` key, `Ionicons`
   and token colours. No other layout, copy, data flow, cap, budget, threshold
   or matcher changes.
3. Prove green and full local gate; update `README.md`, `STATUS.md` and
   `CHANGELOG.md` in the same change. Record CI proof separately after the
   green head and `main` runs.
4. No readiness row is promoted.

## Acceptance

- Red test fails with no back control; green test passes with it.
- Existing cited-answer and not-in-notes tests remain byte-identical.
- Local gate green: typecheck, lint (0 errors), tests, boundaries, QA, web
  export, `e2e:full`.
- README describes the reachable tutor session, including the way back.
