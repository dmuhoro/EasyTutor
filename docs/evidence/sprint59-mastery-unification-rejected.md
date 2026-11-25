# Sprint 59 — E11 mastery unification REJECTED (login ratchet)

## Attempted change

On `feat/mastery-unification`, `lib/mastery.ts` was made a persistence adapter over
`src/domain/learning/mastery.ts::evaluateMastery`: attempted-count records were mapped to
canonical `application` evidence, and every read/write hydrated canonical confidence,
level and band. Three new cases in `tests/mastery.unified.test.ts` were proven red
(**3 failed / 2 passed**) and then green (**5 passed**), with one `evaluateMastery`
implementation confirmed by `rg`.

## Why it was rejected

The unchanged login transfer ratchet (733,000 B) rejected the implementation:

| Variant | Transferred | Result |
|---|---:|---|
| Baseline on `main` | 732,984 B | PASS (16 B headroom) |
| Canonical helper in domain + static import | 733,692 B | FAIL |
| Compact helper, static import | 733,763 B | FAIL |
| Code-split dynamic import | 733,717 B | FAIL |

The canonical selector already lives in the login common chunk; making the shared
`lib/mastery.ts` adapter depend on it adds ~700 B to that chunk. Following the standing
decision from Sprint 55, the **implementation was reverted, not the budget**. No budget,
threshold, weight or assertion was changed, and no row was promoted. `AGENTS.md` and the
CI count gate were returned to the true pre-slice count (110 files / 590 tests) by the
same revert.

## Open condition for E11

E11 needs either a measured, justified headroom reduction in the login common chunk
(governed as its own slice) or a design that keeps the adapter out of that chunk without
duplicating the selector. Until then `E11-T1`, `E11-T2` and `GT-06` stay at their prior
statuses. All local gates were green on the reverted tree; no code from this attempt ships.
