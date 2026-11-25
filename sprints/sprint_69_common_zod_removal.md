# Sprint 69 — Common-chunk Zod removal

## Spec / real boundary

The login route loaded Zod through `lib/api → lib/schemas`, leaving only 28 B of
headroom. Row `GT-10` needed at least 10 KB of real headroom; rows `C22`,
`E10-T2`, `GT-06` and `E11` were blocked by the same common-chunk cost.

## Change

- Added type-only `lib/ai/validation.ts` and switched `lib/ai/reliability.ts`
  to its structural schema contract.
- Replaced runtime Zod in `lib/schemas.ts` with equivalent dependency-free
  quiz/roadmap validators.
- Added `tests/lib/schemas.boundary.test.ts` (8 tests), red before green
  (`1 failed / 7 passed` → `8 passed`).
- Updated tracked suite count to 113 files / 605 tests in `AGENTS.md`, the CI
  drift gate and GT-21.

## Outcome

Login JS fell from 732,972 B to **666,412 B** against the unchanged 733,000 B
budget — 66,588 B of real headroom. `GT-10` is `VERIFIED-LOCAL`. Evidence:
`docs/evidence/sprint69-common-zod-removal.md`.
