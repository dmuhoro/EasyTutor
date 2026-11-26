# DEC-03 — Performance targets (PROPOSAL, NOT RATIFIED)

**Status:** PROPOSED BY AGENT · AWAITING DANIEL'S WRITTEN RATIFICATION · **NOT VERIFIED**
**Register row:** `DEC-03` (P1, `owner: both`, `depends_on: []`)
**Canonical default:** *Keep existing budgets; add a mobile Lighthouse floor of 60, ratchet to 80 after a measured baseline.*

> This file is deliberately **not** at `docs/evidence/DEC-03.md`. The register's
> gate is `test -f docs/evidence/DEC-03.md`; creating it before ratification
> would be a false gate. It stays red until Daniel ratifies.

## What this proposal does and does not change

**Does not change any existing budget.** In particular the login-route ratchet
stays at **733,000 B** and was measured at **666,978 B PASS** on the merged tree
(CI run `45782671212`). There is no proposal here to raise, relax or re-baseline
it. Earlier E11 variants were rejected for breaching that budget; the Sprint 77
spike was rejected by real-stack CI independently of the budget.

| Target | Current state | Proposed action |
|---|---|---|
| Login route JS | 733,000 B hard ceiling, 666,978 B measured (66,022 B headroom) | Unchanged. No waiver, no threshold raise. |
| Desktop Lighthouse | Existing gate unchanged | Unchanged. |
| Mobile Lighthouse | No gate; not measured (`GT-24`, `E15-T2`, `E15-T3`) | Add a floor of **60** only after a measured baseline exists; ratchet to 80 later. |
| AI call latency | Governed by `lib/ai/reliability.ts` timeout/retry | Unchanged. |

## Why a 60 floor, not 80 now

`cost_of_delay`: "No mobile gate means repeated unmeasured regressions; delay
keeps F8 unverifiable." A floor that cannot pass a measured baseline is a
cosmetic gate. The correct order is **measure → set floor at/below the measured
value → ratchet up**, never the reverse. This proposal sets no number until a
real mobile run is recorded.

## Preconditions before any floor is added

1. A pushed CI run of `npm run perf:lighthouse -- --preset=mobile` with the real
   stack, recorded under `docs/evidence/`.
2. A fail-closed assertion in that job, not a report-only step.
3. No change to the 733,000 B login ratchet.

## Ratification record (Daniel to complete)

```
Existing budgets unchanged:  [ ] confirmed
Mobile floor after baseline: [ ] defer   [ ] approve floor of 60 after measurement
Signed: ____________________  Date: ____________
```

Only a completed record plus `docs/evidence/DEC-03.md` may move the register row
off `MISSING`.
