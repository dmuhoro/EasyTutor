# Sprint 75 — CI proof promotions and release 1.16.1

## Spec

Rows promoted to `VERIFIED-LOCAL` in Sprints 69–74 needed an exact pushed green
run before they could be called CI-verified. `docs/readiness/register.json` is
the authoritative status source; `docs/READINESS.md` is generated and never
hand-edited.

## Change

- Promoted C05, C11, C23, GT-17, E5-T3, GT-11, C47, E5-T2 and GT-10 to
  `VERIFIED-IN-CI` with exact run URLs and job names.
- Removed GT-21's stale run `45623624256` (which proved 112/596) and attached
  run `45698949588`, which ran the current 114/611 count grep.
- Bumped the app version from 1.16.0 to 1.16.1 in `package.json`,
  `package-lock.json` (both root fields) and `app.json`, with CHANGELOG, STATUS
  and release evidence updated in the same change.

## Outcome

Full local gate green: typecheck, lint, 114 files / 611 tests, boundaries,
governance, AI boundary, imports, audit, build, QA and login budget
(666,553 / 733,000 B PASS). CI-only claims are limited to the exact runs listed
in `docs/evidence/sprint75-ci-proof-promotions.md`. Daniel-owned blockers remain
open.

Evidence: `docs/evidence/sprint75-ci-proof-promotions.md`,
`docs/evidence/2026-11-26-release-1.16.1.md`.
