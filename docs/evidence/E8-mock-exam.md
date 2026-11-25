# E8 — mock exam assembly and marking (2026-11-25)

## Real defect

`C27`, `GT-03` and `E8-T1` had no mock-exam implementation at all. Their named acceptance is
`npm run test -- tests/flows/mockExam.test.ts`; the file did not exist.

## Implementation

- `src/domain/exam/mockExam.ts` — pure exam domain. `buildMockExam` validates the mark scheme,
  question ids, options and correct indices and fails closed with a typed `MockExamError` reason.
  `gradeMockExam` rejects unknown question ids and out-of-range selections rather than silently
  counting them as wrong; unanswered questions are returned in `unresolved`, never dropped.
- `services/mockExam.ts` — loads questions from the existing offline-first `questionBank`, returns
  `null` when the bank is empty (no invented paper), and marks every question at one mark each.
  A bank item whose `correct_answer` is not among its options is rejected by the domain builder.
- `tests/flows/mockExam.test.ts` — 6 tests covering build validation, marking totals/unresolved
  questions, fail-closed selection handling, empty bank, real bank-derived grading, and a bank
  item with an impossible correct answer.

## Proof

`npm run test -- tests/flows/mockExam.test.ts` — **1 file / 6 tests passed**.

**Negative control:** with the out-of-range selection check removed from `gradeMockExam`, the same
suite failed 1/6 with the expected `INVALID_SELECTION` assertion. The production file was restored
byte-for-byte and the suite returned to 6/6. No test was weakened, skipped or renamed.

Full gate after the change: typecheck 0, lint 0 errors, **100 files / 557 tests**, boundaries 0,
AI boundary PASS, readiness check 0, build 0, QA all systems verified, login
**732,989 / 733,000 B PASS**.

## Honest scope note

The learner-facing exam panel was built but **not shipped**: adding it to the tutor route put the
login chunk at 733,076 B (76 B over the unchanged 733,000 B budget). Rather than raise the budget,
the wiring was reverted before commit. The domain and service are real, tested production code, but
**there is no UI surface for a learner to start or submit a mock exam yet**. That gap is explicitly
open and is not claimed by these rows. The unwired panel scaffold is preserved outside the repo at
`/tmp/work/e8-deferred/MockExamPanel.tsx.unwired` for a later budget-safe slice.

## Rows advanced

C27, GT-03 and E8-T1 → `VERIFIED-LOCAL` on their named acceptance command.
V1-ACADEMIC **10.1 → 15.0 %**; other milestones unchanged; all remain `READY=NO`.
`VERIFIED-IN-CI` withheld until the pushed PR head is green.
