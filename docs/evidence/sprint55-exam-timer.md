# Sprint 55 — real exam timer on the live mock-exam panel

## Real boundary

`E8-T2` was `MISSING`: the mock-exam surface had no countdown. A standalone
`Timer` component existed but was not mounted on the reachable panel, and the
exam domain had no timing rule.

The timing rule now lives in the exam domain as
`mockExamDurationSeconds(exam) = questions × marksPerQuestion × 60`, so the
duration is derived from the exam's declared mark scheme with no hidden default.
`MockExamPanel` ticks down from that value, calls the real `submitMockExam` once
at expiry, disables further answers/finish, and guards against double submission
with a `finished` ref.

## Files

- `src/domain/exam/mockExam.ts`: duration helper with one minute per mark.
- `components/exam/MockExamPanel.tsx`: real countdown and fail-closed single
  submission. The clock is rendered with plain token-styled text: importing the
  icon-bearing `Timer` component pushed the shared login chunk 408 B over the
  unchanged ratchet, so the first implementation was rejected and replaced. No
  new locale key was introduced.
- `tests/flows/mockExam.test.ts`: real-panel timer proof.

## Fail-closed proof

`tests/flows/mockExam.test.ts` now proves two cases beyond the existing six:

1. A three-question, one-mark exam yields 180 seconds; changing the declared
   marks to two yields 360 seconds — no hidden default duration.
2. Mounting the real panel shows `03:00`; advancing 180 seconds shows `00:00`
   and grades the exam by the real submission path.

Before the fix, these two new cases produced **2 failed / 6 passed**
(`mockExamDurationSeconds is not a function`; no `03:00` in the panel). After the
fix the file is **8 passed**. No threshold, budget, weight or assertion was
weakened; the expected result string was corrected to the locale pack's actual
interpolation output rather than a shorter invented string.

## Budget

No threshold changed. The first implementation breached the unchanged 733,000 B
ratchet (733,331 B) because importing `Timer` pulled its icon dependency into
the shared chunk. That implementation was rejected, not the budget. Final real
export measurement:

```
__expo-metro-runtime-*.js   1,893 B
__common-*.js             306,580 B
entry-*.js                424,511 B
total                     732,984 / 733,000 B  PASS
```

## Full local gate

typecheck 0; lint 0 errors / 129 warnings; `npm test` 110 files / 590 tests;
boundaries 0; governance audit 0; AI boundary PASS; imports PASS; readiness 0;
`npm run build` 0; login budget PASS; QA runner SUCCESS; `audit:full` 0
(`audits/full-audit-2026-11-25_13-17-08.txt`). E8-T2 is `VERIFIED-LOCAL` only
until a pushed CI run executes the exact acceptance. Scores: PILOT **53.3 %**,
V1-ACADEMIC **48.5 %**, V1-POLYMATH **36.5 %**, WORLD-CLASS **23.6 %**; all
`READY=NO`.
