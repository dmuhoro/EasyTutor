# Sprint 41 — E4 privacy surface

## Context

E4 / GT-07 / F4: consent, export and deletion reachable and tested. Branch
`fix/e4-privacy-surface` from `origin/main`; no PR opened (two-PR cap). Acceptance:
`npm run test -- tests/flows/privacy.surface.test.ts`, typecheck and lint green.

## Spec / boundary

- Read the live deletion path first: it called `governedWrite` (upsert), not delete. Fixed at
  `Database.governedDelete` using the canonical owner column and the authenticated user.
- No test weakened, skipped, renamed or deleted; no budget/timeout/threshold raised.
- Append-only audit tables are retained by design and stated in the UI/evidence.

## Work done

1. Added governance-scoped DELETE with fail-closed owner column check.
2. Rewrote `deleteUserData()` as an explicit report: 24 mutable tables, per-table failures,
   audit events with id, local state cleared only on full success.
3. Added `PrivacySection` to the real `/settings` route: consent switch, export, confirmed delete,
   and truthful outcome text. Privately scoped locale pack keeps `/login` under budget.
4. Added 8 tests (5 flow/infrastructure, 3 route-interaction), proven red before the fix.

## Evidence

- `docs/evidence/E4-privacy-surface.md`
- Logs `/tmp/work/e4-red3.log`, `e4-green3.log`, `e4-alltests3.log`, `e4-login6.log`,
  `e4-baseline-login2.log`

## Honest handover

DONE at code/local-proof level. Full gates green; login budget 732,862/733,000 B PASS. Eight
pre-existing governance WARNs remain E6 scope. Daniel-only: legal review of privacy wording.
`VERIFIED-IN-CI` withheld (no PR slot).
