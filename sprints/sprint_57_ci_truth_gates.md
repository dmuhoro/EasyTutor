# Sprint 57 — CI truth gates

## Scope

Governance/infrastructure slice on `feat/ci-truth-gates`. No product code,
threshold, weight or budget changed.

## What changed

- CI now runs `npm audit --omit=dev --audit-level=critical` and an exact AGENTS.md
  suite-count grep (GT-12, GT-21 acceptance commands).
- AGENTS.md test count corrected from `98 files / 546 tests` to the true
  `110 files / 590 tests`; GT-21's stale pinned assertion was updated to that
  current truth, not loosened.
- Both rows remain `VERIFIED-LOCAL` until a pushed green CI run proves them.

## Verification

The new grep was proven red before the fix (exit 1) and green after (exit 0).
Local production audit exits 0 with 0 critical advisories. Full local gate:
typecheck 0, lint 0 errors, 110 files / 590 tests, boundaries 0, governance 0,
AI boundary PASS, imports PASS, readiness 0, build 0, login PASS, QA SUCCESS,
`audit:full` 0. Evidence: `docs/evidence/sprint57-ci-truth-gates.md`.

## Open

GT-12/GT-21 promotions require CI proof in a separate docs slice. Academic is
49.2 % and still short of 50 %; E7-T2, C16/GT-22, canonical consumers, capacity
model, i18n/hex/a11y and Daniel decisions remain open.
