# DEC-03 — Performance targets (PROPOSAL · NOT RATIFIED)

**Status:** agent-prepared for Daniel · **NOT VERIFIED** · **no evidence file exists**
**Register row:** `DEC-03` · P1 · `owner: both` · `depends_on: []` · gate `test -f docs/evidence/DEC-03.md`
**Full background:** `docs/decisions/DEC-03-performance-targets-proposal.md`

> The agent does **not** create `docs/evidence/DEC-03.md`. The gate stays red
> until Daniel signs a measured target, not an aspiration.

## Question

Do existing budgets stay, and what mobile Lighthouse floor is acceptable?

## Recommended default

**Keep every existing budget unchanged.** Add a mobile Lighthouse floor of
**60** only after a median-of-3 measured baseline is recorded, then ratchet to
**80** after that baseline is green. No number is set by this proposal alone.

## Data

| Measure | Current value | Change proposed |
|---|---|---|
| Entry gzip | 449,926 / 450,000 B (Node 22.13, `CI=true`) | none |
| Entry raw | 1,700,100 / 1,750,000 B | none |
| Login route | 675,543 / 733,000 B | none |
| Desktop Lighthouse | local export >=80 (Sprint 33); production browser `/` 65→71, `/login` 74→66 — **not a pass** | none |
| Mobile Lighthouse | `/` 45, `/login` 46 — **NOT MET**, no fail-closed gate | floor 60 after measurement, then 80 |

- `cost_of_delay`: *No mobile gate means repeated unmeasured regressions; delay keeps F8 unverifiable.*
- `D12` (approve mobile target), `GT-24`, `E15-T1/T2/T3` stay blocked until this
  decision exists; `E15-T1` is coupled to `GT-24` in the register.
- `DEC-03` is worth +2 in V1-POLYMATH and WORLD-CLASS when signed.

## Cost of delay

An unmeasured floor is a cosmetic gate. Without a signed decision the mobile
chain cannot be made fail-closed, and repeated regressions go unobserved.

## Paste-ready ratification block (Daniel)

```
DECISION DEC-03 — PERFORMANCE TARGETS
Existing budgets unchanged:                    [ ] confirmed
Measure median-of-3 mobile baseline first:      [ ] confirmed
Then set fail-closed floor:                     [ ] 60   [ ] other: ____
Ratchet to 80 after baseline is green:          [ ] yes  [ ] later
D12 mobile target approved in the same record:  [ ] yes  [ ] no

Signed: ______________________   Date: ____________

Then write this record to: docs/evidence/DEC-03.md
```

Only that Daniel-authored file may move `DEC-03` off `MISSING`.
