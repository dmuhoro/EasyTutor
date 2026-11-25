# DEC-02 — Curriculum priority and reviewer (PROPOSAL, NOT RATIFIED)

**Status:** PROPOSED BY AGENT · AWAITING DANIEL'S WRITTEN RATIFICATION · **NOT VERIFIED**
**Register row:** `DEC-02` (P0, `owner: both`, `depends_on: []`)
**Canonical default:** *KCSE first, then Kenya TVET automotive, then one university pack; Daniel reviews.*

> This file is deliberately **not** at `docs/evidence/DEC-02.md`. The register's
> acceptance gate is `test -f docs/evidence/DEC-02.md`. Creating that file now
> would satisfy a file-existence check without a decision having been made. The
> gate stays red until Daniel ratifies and writes the real evidence file.

## Decision required

| Priority | Pack | Rationale |
|---|---|---|
| 1 | KCSE Mathematics | Largest Kenyan secondary cohort; governed seed and question bank already exist (`supabase/seed_kcse*.sql`). |
| 2 | Kenya TVET automotive | Next real vocational cohort; tests prove a second non-math subject can project canonical state. |
| 3 | One university pack | Deferred until pilot review; do not spread pack authoring across three domains before the first cycle. |
| Reviewer | Daniel (named individual) | `cost_of_delay`: without a named reviewer packs stay DRAFT and `F3` cannot be claimed. |

## Decisions that are explicitly *not* being made here

- No pack content is authored or promoted by this proposal.
- No pack is marked APPROVED; all remain DRAFT until the named reviewer signs off.
- This does not change the portal routing map (`high_school`, `university`,
  `knowledge_explorer`) or any ADR.

## What ratification unlocks

- `F3` content completeness can be evidenced against a named reviewer.
- The P0 `DEC-02` gate can close for PILOT, V1-ACADEMIC, V1-POLYMATH and WORLD-CLASS.

## What remains blocked

- Pack approval is still blocked on actual review, which only Daniel can perform.
- Hosting the packs needs staged Supabase (`D03`), also Daniel-only.

## Ratification record (Daniel to complete)

```
Accept default order:  [ ] yes   [ ] no -> ____________________________
Named reviewer:        ________________________________________________
Review SLA:            ____________________  Date: ____________________
```

Only a completed record plus `docs/evidence/DEC-02.md` may move the register row
off `MISSING`.
