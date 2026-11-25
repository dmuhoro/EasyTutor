# Sprint 53 — real exam countdown on Home

## Real boundary

`exam_date` is captured by the setup wizard into `profiles.exam_date`. The
learner-facing Home screen previously displayed only roadmap completion; its
comment explicitly said the reference countdown was not reproduced.

Home now reads that column through `Database.governedQuery` with:

- `table: 'profiles'`
- `columns: 'exam_date'`
- `portalType: portalFromMode(learningMode ?? 'high_school')`
- `userId: user.id`

There is no raw `.from('profiles')` call and no ungoverned fallback. A query
error is thrown into the existing idle-task error wrapper, logged as
`HOME_exam_date_fetch_failed`, and leaves the countdown hidden rather than
showing a fabricated value.

## Fail-closed date handling

- Invalid or missing date: no countdown is rendered.
- Past date: `examDatePassed` is rendered; no negative day count is shown.
- Same-day date: renders as `Exam in 0 days`, not a negative or stale value.

New keys `examInDays` and `examDatePassed` were added to en/sw/fr so the touched
screen has no non-`t()` user-facing copy.

## Proof

`tests/screens/examCountdown.test.ts` mounts the real `screens/tabs/index.tsx`
and proves five cases: governed profile read with real portal and owner, future
date rendering, absent date hidden, past date honestly reported, and query
failure logged with no countdown.

Before the fix, the exact acceptance command produced **4 failed / 1 passed**
(the missing-date negative control already passed). After the fix it is
**5 passed**. The governing test also proves no raw table access is used by the
Home screen because the only mocked data boundary is `Database.governedQuery`.

## Budget

No threshold, timeout, budget, weight or assertion was changed. Real export
measurement after the change:

```
__expo-metro-runtime-*.js   1,893 B
__common-*.js             306,580 B
entry-*.js                424,508 B
total                     732,981 / 733,000 B  PASS
```

Same total as the pre-slice baseline (19 B headroom).

## Full local gate

typecheck 0; lint 0 errors / 129 warnings; `npm test` 110 files / 588 tests;
boundaries 0; governance audit 0; AI boundary PASS; imports PASS; readiness 0;
`npm run build` 0; login budget PASS; QA runner SUCCESS; `audit:full` 0
(`audits/full-audit-2026-11-25_12-32-37.txt`). Scores remain local-only until a
pushed CI run executes the exact acceptance: PILOT **53.3 %**, V1-ACADEMIC
**42.7 %**, V1-POLYMATH **36.5 %**, WORLD-CLASS **23.6 %**; all `READY=NO`.
Open academic P0s fell from 10 to 7.
