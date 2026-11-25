# Sprint 46 — E8 mock exam domain and marking

## Directive

Implement mock-exam assembly and marking with fail-closed validation, proven by the named
acceptance command, without weakening any gate or raising the login-route budget.

## Work done

- Added `src/domain/exam/mockExam.ts` (typed validation and grading with explicit unresolved
  answers) and `services/mockExam.ts` (offline-first question-bank loader, no invented papers).
- Added `tests/flows/mockExam.test.ts` — 6 tests, plus a red/green negative control on the
  selection check.
- Advanced C27, GT-03 and E8-T1 to `VERIFIED-LOCAL`; V1-ACADEMIC 10.1 → **15.0 %**.
- A learner-facing panel was attempted but reverted: it exceeded the unchanged login budget by
  76 B. No threshold, timeout or assertion was changed to make it fit.

## Evidence

`docs/evidence/E8-mock-exam.md`. Full gate green: typecheck 0, lint 0 errors, 100 files / 557
tests, boundaries 0, AI boundary PASS, readiness check 0, build 0, QA verified, login
732,989 / 733,000 B PASS.

## Honest handover

The exam service is tested and ready; the **UI surface is still open**. Shipping it requires a real
login-route byte reduction first (no budget change). E9, C03/C04/C11, C49, WORLD and E6 remain
untouched.
