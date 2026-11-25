# E8 — budget-safe learner UI (2026-11-25)

This closes the UI gap recorded in `docs/evidence/E8-mock-exam.md` without changing the login
budget, any timeout, or any assertion.

## What changed

- Restored `components/exam/MockExamPanel.tsx` on the live tutor route
  (`screens/tutor/session.tsx`), loading real exam data through `services/mockExam.ts`.
- The panel renders **existing locale keys only** (`quiz`, `finishQuiz`, `correctAnswer`,
  `youAnswered`, `outstanding`). The first attempt added five new strings to `en.json`, which is in
  the shared chunk loaded by `/login` and put the route at 733,076 B (76 B over). Reusing existing
  translations keeps new strings out of that shared chunk.
- Removed 17 unused imports from modules in the startup graph. Measured effect on transferred
  bytes: **zero** (Metro already tree-shook them), but ESLint warnings fell from 147 to 130. This is
  recorded honestly and is not claimed as the budget fix.

## Proof

- `npm run test -- tests/screens/examPanel.test.tsx` — **1 file / 1 test passed**. The test renders
  the real panel, presses the real radio handlers (q1 correct, q2 wrong, q3 unanswered), presses the
  real submit handler, and asserts the graded result counts from the real marking service. No
  network edge or grading function is substituted.
- **Negative control:** with `correct` never incremented in `gradeMockExam`, the same UI test failed
  1/1 with `expected … to contain 'Correct answer 1/3'`. The production file was restored
  byte-for-byte and the test returned to 1/1. No test was weakened, skipped or renamed.
- Full gate: typecheck 0, lint 0 errors, **101 files / 558 tests**, boundaries 0, AI boundary PASS,
  readiness check 0, build 0, QA all systems verified, login **732,983 / 733,000 B PASS**.

## Claim status

C27, GT-03 and E8-T1 remain `VERIFIED-LOCAL`; their register evidence now also names the UI test.
Scores are unchanged (V1-ACADEMIC 15.0 %). `VERIFIED-IN-CI` is still withheld until the pushed PR
head is green. The previously recorded "no UI surface" gap is now **closed**.
