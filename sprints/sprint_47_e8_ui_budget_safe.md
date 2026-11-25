# Sprint 47 — E8 learner UI, budget-safe

## Directive

Close the E8 UI gap recorded in Sprint 46 without raising the 733,000 B login budget or weakening
any gate.

## Work done

- Restored `MockExamPanel` on the live tutor route, backed by the real exam service and domain.
- Reused existing locale keys instead of adding strings to the shared login chunk: the UI-present
  build measures **732,983 / 733,000 B PASS** (the first UI attempt was 733,076 B).
- Removed unused imports from the startup graph; measured byte effect was zero (tree-shaken), lint
  warnings 147 → 130. Not claimed as the budget fix.
- Added `tests/screens/examPanel.test.tsx` with a red/green negative control on real grading.
- Register evidence for C27/GT-03/E8-T1 now names both the flow test and the UI test. Scores stay
  V1-ACADEMIC **15.0 %**, all milestones `READY=NO`.

## Evidence

`docs/evidence/E8-ui-budget-safe.md`. Full gate green before push: typecheck 0, lint 0 errors,
101 files / 558 tests, boundaries 0, AI boundary PASS, readiness check 0, build 0, QA verified,
login 732,983 / 733,000 B PASS.

## Honest handover

The UI gap from Sprint 46 is closed. E9, C03/C04/C11, C49, WORLD and E6 remain untouched. No PR is
open yet; `VERIFIED-IN-CI` remains withheld until a pushed head is green.
