# Sprint 53 — exam countdown

## Scope

One learner-facing slice on `feat/exam-countdown`. No budget, timeout, threshold
or assertion changed. No visual work outside the countdown itself.

## What changed

- Home reads `profiles.exam_date` through `Database.governedQuery` with the
  resolved portal and authenticated owner, inside the existing idle scheduler.
- A future date renders `Exam in N days`; a past date renders an honest passed
  state; missing, invalid or failed reads render no countdown and failures are
  logged as `HOME_exam_date_fetch_failed`.
- Added `examInDays` / `examDatePassed` to all three locale packs so the touched
  screen introduces no raw user-facing strings.
- Added `tests/screens/examCountdown.test.ts` with a red-before-green proof:
  4 failed / 1 passed before the fix, 5 passed after.
- Promoted C28, GT-04, E9-T1, E9-T2 and E9-T3 only to `VERIFIED-LOCAL`; CI proof
  awaits a pushed green run.

## Verification

Full local gate green: typecheck 0, lint 0 errors, tests 110 files / 588 tests,
boundaries 0, governance 0, AI boundary PASS, imports PASS, readiness 0, build 0,
login budget PASS, QA SUCCESS, `audit:full` 0. Login transfer remained 732,981 /
733,000 B PASS with no budget change. Scores: PILOT 53.3 %, V1-ACADEMIC 42.7 %,
V1-POLYMATH 36.5 %, WORLD-CLASS 23.6 %; all `READY=NO`. Evidence:
`docs/evidence/sprint53-exam-countdown.md`.

## Open

The five rows are not `VERIFIED-IN-CI` until the exact acceptance command runs
in a pushed CI job. The remaining readiness gaps are duplicate mastery (E11/GT-06),
remaining canonical consumers (E10-T2), C20/GT-14, C21, C23, C13, capacity model,
raw-hex/i18n/a11y gates and Daniel-blocked live/staging/decision evidence.
