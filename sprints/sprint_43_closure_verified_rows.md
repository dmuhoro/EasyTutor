# Sprint 43 — Closure layer: verified rows

## Directive

Move incomplete work-packages forward with real proof only; no fabricated score, no weakened gate.

## Work done

- Brought up the real local Supabase stack (`supabase start -x studio,imgproxy`, `supabase db reset
  --no-seed`) on the pinned API port `:54331` and mail port `:54325`; ran `npm run test:auth-flow`
  (4/4 green). `supabase/config.toml` restored to tracked content afterwards.
- Added `tests/mastery.unified.test.ts` (2 tests): governed DB read + ownership-stamped upsert for
  `subject_mastery`. Proven red with the write disabled, green after restore.
- Added `tests/domain/prerequisites.test.ts` (5 tests) for the pure prerequisites engine.
- Corrected C25's stale acceptance path to the existing `tests/flows/roadmap.persistence.test.ts`
  (3/3 green); the old path named a file that never existed.
- Advanced C01, C02, C18, C19, C25 from `IMPLEMENTED-UNPROVEN` to `VERIFIED-LOCAL` with tracked
  test evidence; regenerated `docs/READINESS.md`.

## Result

PILOT 16.1 → **17.7 %** (open P0 30 → 27); V1-POLYMATH 12.4 → **14.4 %** (open P0 12 → 11).
V1-ACADEMIC and WORLD-CLASS unchanged. No milestone is READY; ≥80 % is not claimed.

## Honest handover

C03/C04, C11, C22/E10-T1 were deliberately left open because their named acceptance commands do
not actually prove those rows. C12/C45/C49 remain structurally or credential blocked. Evidence:
`docs/evidence/closure-verified-rows.md`. `VERIFIED-IN-CI` withheld for newly flipped rows (no PR
slot; two PRs already open).
