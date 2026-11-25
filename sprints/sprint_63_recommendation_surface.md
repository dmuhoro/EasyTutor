# Sprint 63 — Recommendation surface on Home (C21)

## Spec / real boundary

C21 requires recommendations to be surfaced on Home. The real selector is
`getRecommendedTopics` in `lib/recommendations.ts`, backed by governed mastery
records. The real consumer is `screens/tabs/index.tsx`. No new endpoint, mock
service or shared helper was introduced.

## Change

- Home calls the selector for the signed-in learner using the active roadmap's
  subject; no subject means no claim.
- Up to three returned topics render in a new section using existing
  translations only (`topics`, `flagged`). Read failure logs
  `HOME_recommendations_failed` and renders nothing.
- New acceptance file `tests/flows/recommendation.surface.test.ts` with three
  red-before-green cases.
- Exact suite-count gate moved from 111/593 to 112/596 in `AGENTS.md` and CI;
  GT-21 demoted to `VERIFIED-LOCAL` because the new grep is not yet CI-proven.

## Verification

Red `2 failed / 1 passed`, green `3 passed`. Full gate local: typecheck 0,
112 files / 596 tests, build 0, QA and audits per pre-commit gate,
login 732,974 / 733,000 B PASS. Evidence:
`docs/evidence/sprint63-recommendation-surface.md`.

## Open

C21 and GT-21 are `VERIFIED-LOCAL` until a pushed green run executes their
exact acceptance commands. E11 remains blocked on login headroom. C22/E10-T2,
world-class design gates, capacity, staging and Daniel-only decisions remain open.
