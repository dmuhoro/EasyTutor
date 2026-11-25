# Sprint 55 — exam timer

## Scope

One reachable academic slice on `feat/exam-timer`. No threshold, timeout,
budget or assertion weakened. No new user-facing string: the panel reuses
`t('timer')` and existing result keys.

## What changed

- Added `mockExamDurationSeconds` to the exam domain: one minute per declared
  mark, derived from the question count and mark scheme.
- Added a ticking countdown to `MockExamPanel` with single, fail-closed
  submission at expiry. The clock uses plain token-styled text: importing the
  icon-bearing `Timer` component breached the unchanged login budget by 331 B,
  so that implementation was rejected and replaced before the gate.
- Added two real-panel timer cases to `tests/flows/mockExam.test.ts`, red before
  green (2 failed / 6 passed before, 8 passed after).
- Promoted E8-T2 only to `VERIFIED-LOCAL`; CI proof awaits a pushed green run.

## Local proof

`npm test -- tests/flows/mockExam.test.ts` 8/8; full local gate green:
typecheck 0, lint 0 errors, tests 110 files / 590 tests, boundaries 0,
governance 0, AI boundary PASS, imports PASS, readiness 0, build 0, login
transfer 732,984 / 733,000 B PASS with unchanged budget, QA SUCCESS, `audit:full`
0. Scores: PILOT 53.3 %, V1-ACADEMIC 48.5 %, V1-POLYMATH 36.5 %, WORLD-CLASS
23.6 %; all `READY=NO`. Evidence: `docs/evidence/sprint55-exam-timer.md`.

## Open

E8-T2 is not `VERIFIED-IN-CI` until the exact acceptance runs in a pushed green
CI job. Remaining academic gaps: C16/GT-22 diagrams, E7-T2 source status,
C20/GT-14, C21, C23, C13, GT-12 advisories and Daniel decision/staging items.
