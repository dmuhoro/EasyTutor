# Sprint 49 — canonical state and proof-first readiness

## Scope

One governed slice on `feat/readiness-pilot-state`: make the second subject use the same
journey/state path as Mathematics, then promote only rows whose acceptance was actually executed
in this tree. No visual/UI polish, no budget change, no threshold or assertion relaxation.

## What changed

- `src/domain/learning/subjectJourney.ts`, `canonicalJourney.ts`: shared state machine and single
  canonical projection used by Mathematics and Physics.
- `src/domain/physics/`: diagnostic bank, skill graph and journey entry point.
- `store/mathJourneyStore.ts` delegates to the canonical projector; the Home/You/Math-journey
  selectors consume it.
- New tests: `tests/domain/canonicalState.consumers.test.ts`,
  `tests/flows/secondSubject.test.ts`, `tests/flows/offlineSync.test.ts`,
  `tests/flows/lowData.test.tsx`, `tests/locales.coverage.test.ts`,
  `tests/flows/cost.model.test.ts`.
- 26 register rows promoted to `VERIFIED-LOCAL` after executing acceptance; eight candidates were
  rejected because the executed command did not prove the row's own claim. Scope, replacements and
  negative controls are recorded in `docs/evidence/sprint49-verified-rows.md`.

## Verification

Every row in the evidence table was run locally with exit 0. The 247-row local RLS matrix passed
247/247. `npm run typecheck` is 0; the new suites are 3/3, 3/3, 3/3, 3/3, 3/3 and 2/2. The
readiness scorer and checker are green after the evidence/test paths were staged, proving the
gate refuses untracked evidence rather than trusting a claim. The first journey implementation
breached the login transfer budget; the state machine was co-located with the already bundled
canonical-state module, restoring **732,983 / 733,000 B PASS** with no budget change. Scores from
local proof: PILOT 35.7 %, V1-ACADEMIC 24.5 %, V1-POLYMATH 25.4 %, WORLD-CLASS 16.3 %.

## Open

`VERIFIED-LOCAL` is not `VERIFIED-IN-CI`. The rows need a pushed green run before the register
may claim CI proof. GT-06, GT-13, C20/GT-14, C21, C16/GT-22, C28/GT-04/E9 countdown, raw-hex,
a11y/mobile Lighthouse, staging, credentials and decision rows remain open. No P0 was declared
resolved without its real acceptance.
