# Sprint 76 — E7-T2 curriculum source status: proof record

## Premise checked in code

- `lib/curriculum/schema.ts:52` defines `source_status: OFFICIAL | COMMUNITY | DRAFT`.
- The only bundled pack (`lib/curriculum/packs/kenya-tvet-automotive.json`) is
  `DRAFT`, subject `tvet-ke-automotive`.
- The learner route `app/high-school/[subject]/topics.tsx` lazily renders
  `screens/high_school/[subject]/topics.tsx`, which currently shows
  "Syllabus Guide" with no status.
- The tutor prompt already labels the same pack `DRAFT`
  (`services/curriculumPrompt.ts`, proved in `docs/evidence/E7-curriculum-runtime.md`).
- The register acceptance `npm run test -- tests/lib/curriculum/runtime.test.ts`
  proves only the prompt string, not a learner-visible status. It is NOT used
  as proof of E7-T2.

## Red control (before production code)

Command:

```
npm run test -- tests/screens/curriculum-status-badge.test.tsx
```

Result: **1 file / 3 tests — 2 failed, 1 passed**.

- `labels a bundled DRAFT subject as not official and needing review` failed at
  `expect(text).toMatch(/DRAFT/)`; rendered text contained the subject name,
  "Syllabus Guide", "Continue Learning" and topic titles but no status.
- `claims OFFICIAL only when the pack itself says OFFICIAL` failed at
  `expect(text).toMatch(/OFFICIAL/)` with the same unlabelled render.
- `shows no status claim when the routed subject has no bundled pack` passed,
  confirming the negative case is not what made the suite fail.

The test mocks only the router, stores, topic list and the pack's *status
value*; it renders the real `SubjectTopics` screen and keeps the real bundled
pack data. No assertion, timeout or threshold was weakened.

## Green proof (after the fix)

- `npm run test -- tests/screens/curriculum-status-badge.test.tsx tests/lib/curriculum/runtime.test.ts`
  — **2 files / 8 tests passed**. DRAFT renders "DRAFT · NOT OFFICIAL — NEEDS
  REVIEW"; OFFICIAL is rendered only when the mocked status says OFFICIAL; an
  unmatched subject renders no status claim.
- The import stayed on the lazy topics screen. `npm run build` exit 0 and
  `npm run perf:login-route` **666,978 / 733,000 B PASS** (prior release
  666,553 B: +425 B, 66,022 B headroom). No budget, threshold or assertion
  changed. The Sprint 45/59/62 rejection condition did not trigger.
- Full local gate: typecheck 0; lint 0 errors / 129 warnings; `npm test`
  **115 files / 614 tests**; boundaries 0; governance PASS; declared imports
  PASS (461 files); AI boundary PASS; `npm audit --omit=dev` PASS; cycles 0
  errors; secret/public-env guards PASS; `npm run build` exit 0; QA runner
  "All systems verified"; readiness check 0.
- CI-only status is deliberately withheld: E7-T2 is promoted to
  `VERIFIED-LOCAL`, not `VERIFIED-IN-CI`, until an exact pushed green run is
  attached.

## Honest handover

The bundle is now validated at build time but no live device/browser proof was
attempted. The Kenyan TVET pack remains DRAFT and still needs Daniel's content
review; this change only makes that status visible to the learner. E11 remains
untouched: Sprints 59 and 62 proved its common-chunk adapter breaches the same
ratchet, and that is not reopened here.
