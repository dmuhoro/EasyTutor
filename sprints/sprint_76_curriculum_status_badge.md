# Sprint 76 — E7-T2 curriculum source status on the real topics screen

## Spec

`lib/curriculum/schema.ts` defines `source_status` as `OFFICIAL | COMMUNITY |
DRAFT`, and the only bundled pack is `DRAFT`. Today a learner on
`/high-school/[subject]/topics` sees a "Syllabus Guide" header with no status,
while the tutor prompt already labels the same pack `DRAFT`
(`services/curriculumPrompt.ts`). The register's current E7-T2 acceptance
(`tests/lib/curriculum/runtime.test.ts`) asserts a `DRAFT` string in the
prompt, not that a learner can see the status. That is a false gate and is not
used as proof here.

## Real boundary

`screens/high_school/[subject]/topics.tsx` is the screen behind
`app/high-school/[subject]/topics.tsx`. The status must come from the same
CI-validated source used by the tutor path (`lib/curriculum/runtime.ts`), not
from a hardcoded literal or a second copy of the pack.

## Scope

- One lazy screen renders a truthful status badge only when the routed subject
  matches a bundled pack subject. No match means no badge — never an implied
  OFFICIAL claim.
- Status text is derived from the pack's `source_status`; DRAFT/COMMUNITY are
  explicit "not official / needs review" labels. OFFICIAL is shown only when
  the pack actually says OFFICIAL.
- A real-screen test renders the unmodified screen and must fail before the
  fix. Its red output is recorded before production code is touched.
- No curriculum content, schema, governance rule, budget or threshold changes.
- Daniel review of the pack is NOT in scope: this only surfaces the status he
  already marked DRAFT.

## Acceptance commands

```
npm run test -- tests/screens/curriculum-status-badge.test.tsx
npm run test -- tests/lib/curriculum/runtime.test.ts
npm run typecheck && npm run lint
npm test
node scripts/architecture/validate_boundaries.js
npm run build && npm run perf:login-route   # unchanged 733,000 B ratchet
node scripts/qa/qa_runner.js
node scripts/readiness/score.mjs check
```

E7-T2 may be promoted only if the real-screen test, the unchanged runtime test
and the unchanged login budget are all green on a pushed CI run.

## Budget contingency

The login ratchet has 16–28 B headroom and E7-T1 already needed its Zod import
moved off a shared module. If importing the runtime into this second lazy
screen hoists pack bytes into the login common chunk, the implementation is
reverted, the budget is NOT raised, E7-T2 stays MISSING, and the measurement is
recorded as a rejection. No weaker gate or substitute test is accepted.

## Outcome

- Red control on the unmodified screen: `2 failed / 1 passed`; recorded in
  `docs/evidence/sprint76-curriculum-status-badge.md` before the fix.
- Green after the fix: real-screen test plus runtime test `2 files / 8 tests`;
  full suite `115 files / 614 tests`; full gate green including unchanged login
  budget `666,978 / 733,000 B PASS`.
- E7-T2 promoted to `VERIFIED-LOCAL` with the acceptance repointed from the
  prompt-only test to the real-screen test. `VERIFIED-IN-CI` is withheld until
  an exact pushed green run is attached. Generated V1-ACADEMIC: 51.9 → 53.0 %.

## Explicitly not in this sprint

E11 (mastery unification) was attempted in Sprints 59 and 62 and reverted both
times for the same login-ratchet breach; no part of it is retried here. The
Kenyan TVET pack remains DRAFT and still needs Daniel's content review; the
badge only reports that existing status.
