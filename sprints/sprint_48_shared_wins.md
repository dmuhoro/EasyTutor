# Sprint 48 — shared-win readiness slice

## Directive

Start the single sequential branch `feat/readiness-to-50` after merging green PR #22. Close the four
rows that count in every milestone before opening any category-specific slice.

## Work done

- **C49** (P0, VERIFIED-IN-CI): replaced the unusable `gh pr checks --required` acceptance with a
  fail-closed all-checks checker; 5/5 unit tests including empty/pending/failing negatives; ran it
  against the green PR #22 run `45560024991`.
- **GT-09** (P1, VERIFIED-LOCAL): removed the real-provider stall from the quiz acceptance by
  injecting the deterministic router seam; 20/20 consecutive passes; 6 s stalled-router negative
  control failed 1/1 at the unchanged 5 s timeout.
- **GT-12** (P1, VERIFIED-LOCAL): narrow `shell-quote` override clears the only critical advisory;
  audit exit 0, 33 non-critical advisories remain openly recorded. Reverted the broad `npm audit
  fix` lockfile because it broke the unchanged 732,983 B login budget.
- **GT-20** (P2, VERIFIED-LOCAL): removed four unused declared deps and archived (via `git mv`) the
  zero-byte root timestamp and the vendored dashboard blob; declared-import gate passes 441 files.

## Evidence

`docs/evidence/sprint48-shared-wins.md`. Full gate green before push: typecheck 0, lint 0 errors,
102 files / 563 tests, boundaries 0, AI boundary PASS, declared imports PASS, readiness check 0,
build 0, QA verified, login 732,983 / 733,000 B PASS, audit exit 0.

## Score movement

PILOT 24.4 → **26.4 %**, V1-ACADEMIC 15.0 → **19.5 %**, V1-POLYMATH 14.4 → **19.2 %**,
WORLD-CLASS 10.5 → **14.7 %**. All remain `READY=NO`; the remaining gap is quantified in
`docs/READINESS.md`.

## Honest handover

Shared rows are closed. The next layer is the PILOT/POLYMATH canonical-state slice; E9, i18n,
zero-hex tokens, a11y/mobile Lighthouse, E6 governance and final register promotion remain open.
No P0 is closed by this slice alone and no Daniel-only or decision row was touched.
