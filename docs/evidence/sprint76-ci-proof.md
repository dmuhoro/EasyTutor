# Sprint 76 — E7-T2 CI proof (2026-11-26)

## Exact pushed run

- PR: https://github.com/dmuhoro/EasyTutor/pull/50
- Run: https://github.com/dmuhoro/EasyTutor/actions/runs/45766558025
- Head SHA: `56d96bfe6083e3007dd64b7cd52ab30d9a8648fb`
- Conclusion: `success`; all required checks pass (Supabase Preview skipped by
  its existing configuration).

## Observed in the `build` job log

- `tests/screens/curriculum-status-badge.test.tsx` — 3 tests passed, including
  the DRAFT label, OFFICIAL-only-from-pack and no-unmatched-claim cases.
- `Test Files 115 passed (115)` and `Tests 614 passed (614)` in both the Tests
  and QA runner steps.
- The fail-closed count gate ran the exact command
  `grep -q "115 files / 614 tests" AGENTS.md`.
- RLS matrix (247 assertions, fail closed), real-stack E2E, Vercel Preview and
  Vercel production deployment all passed on the same run.

## Promotion

E7-T2 moves from `VERIFIED-LOCAL` to `VERIFIED-IN-CI` on this exact run only.
No test, threshold, budget or status weight was changed to obtain the pass.
Generated V1-ACADEMIC becomes 51.9 → 53.7 % (53.0 % at VERIFIED-LOCAL).
No CI-only claim is made for any other row in this sprint.
