# Sprint 73 — false-acceptance repairs (C23, GT-17)

## Spec / real boundary

Two readiness rows claimed gaps that their registered acceptance could not
observe: `C23` pointed at a non-existent test file, and `GT-17` was `MISSING`
even though its named test existed and was green.

## Change

- `tests/screens/home-today.test.tsx`: extended the existing real Home
  weak-spot test with an empty-state assertion (no section, no `Missed` lines,
  no `Review` button when there are no wrong answers). Red control: forcing
  the section to render empty gave `1 failed / 6 passed`; restored clean.
  Repointed C23 acceptance to this real screen test.
- Promoted `GT-17` to `VERIFIED-LOCAL` on the existing token-derived cost test;
  no code change.

Test count unchanged: 114 files / 611 tests.

## Outcome

`C23` and `GT-17` promoted to `VERIFIED-LOCAL`. CI-only status is withheld until
an exact pushed green run is recorded.

Evidence: `docs/evidence/C23.md`, `docs/evidence/GT-17.md`.
