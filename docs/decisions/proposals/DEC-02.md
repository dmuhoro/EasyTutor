# DEC-02 — Curriculum priority and reviewer (PROPOSAL · NOT RATIFIED)

**Status:** agent-prepared for Daniel · **NOT VERIFIED** · **no evidence file exists**
**Register row:** `DEC-02` · P0 · `owner: both` · `depends_on: []` · gate `test -f docs/evidence/DEC-02.md`
**Full background:** `docs/decisions/DEC-02-curriculum-priority-proposal.md`

> The agent does **not** create `docs/evidence/DEC-02.md`. The gate must stay red
> until Daniel has actually named the reviewer and the order.

## Question

Which curriculum pack is reviewed first, in what order next, and who is the named reviewer?

## Recommended default

**KCSE first → Kenya TVET Automotive Science Principles → one university pack.**
Daniel is the reviewer. Packs stay `DRAFT` until the signed review exists.

## Data

- Register `recommended_default`: *KCSE first, then Kenya TVET automotive, then one university pack; Daniel reviews*.
- `cost_of_delay`: *Without a reviewer packs stay DRAFT and F3 cannot be claimed.*
- `D13` (flip DRAFT to OFFICIAL) and `D14` (confirm marking scheme per subject)
  are both `MISSING` and Daniel-owned.
- The real high-school subject screen already shows `source_status`: DRAFT and
  COMMUNITY are labelled "not official"; OFFICIAL is shown only from the pack
  itself (`E7-T2`, `VERIFIED-IN-CI`). No code change is needed to make the label
  truthful; only the signed review is missing.

## Cost of delay

Without a named reviewer no pack can become OFFICIAL, so `F3` and the academic
milestone's curriculum claims remain unprovable. This decision is worth +3
points in both V1-POLYMATH and WORLD-CLASS when Daniel signs it.

## Paste-ready ratification block (Daniel)

```
DECISION DEC-02 — CURRICULUM PRIORITY AND REVIEWER
[ ] accept default: KCSE -> Kenya TVET Automotive Science Principles -> one university pack
[ ] change order: 1=____  2=____  3=____
Reviewer (name): ______________________
Packs remain DRAFT until signed: [ ] confirmed

Signed: ______________________   Date: ____________

Then write this record to: docs/evidence/DEC-02.md
```

Only that Daniel-authored file may move `DEC-02` off `MISSING`.
