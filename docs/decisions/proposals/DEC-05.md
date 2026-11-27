# DEC-05 — AI budget (PROPOSAL · NOT RATIFIED)

**Status:** agent-prepared for Daniel · **NOT VERIFIED** · **no evidence file exists**
**Register row:** `DEC-05` · P0 · `owner: both` · `depends_on: [D07]` · gate `test -f docs/evidence/DEC-05.md`

> The agent does **not** create `docs/evidence/DEC-05.md`. The gate stays red
> until Daniel ratifies and `D07` (Groq tier and token/day limit) is recorded.

## Question

What is the hosted-AI spend envelope for the pilot, and what happens when it is reached?

## Recommended default

**200 calls/user/day and 1000 output tokens/call** (the already-enforced code
values), budgeted for **10 learners** and re-planned at **25**. Free tier only;
**$0 committed spend until ratified**. Add a global daily cap and a visible
degrade message so the cohort cannot exhaust a shared quota silently.

## Data

- Register `recommended_default`: *Cap 200 calls/user/day and 1000 tokens/call; budget for 10 learners then re-plan at 25*.
- `cost_of_delay`: *Without a tier decision the pilot can exhaust free quota mid-cohort.*
- `supabase/functions/ai-proxy/handler.ts:23–24` already sets
  `MAX_OUTPUT_TOKENS = 1000` and `DAILY_LIMIT = 200`; `handler.ts:98` returns
  HTTP 429 when the per-user count exceeds 200.
- A **global** daily cap is not present in the handler today; it is a proposed
  change, not a current protection. No code is changed until this is signed.
- `D07` (confirm Groq tier and token/day limit) is `MISSING` and Daniel-owned;
  `DEC-01` is also blocked on `D16`.

## Cost of delay

Without the tier decision the pilot can exhaust free quota mid-cohort, which
silently degrades the learning experience. This is a P0 decision gate.

## Paste-ready ratification block (Daniel)

```
DECISION DEC-05 — AI BUDGET
Keep 200 calls/user/day and 1000 output tokens/call:  [ ] confirmed
Global daily cap:      [ ] approve   [ ] value ____   [ ] defer
Visible degrade message on cap:                       [ ] confirmed
Free tier only, $0 committed spend:                   [ ] confirmed
Re-plan at 25 learners:                               [ ] confirmed
D07 tier + token/day limit recorded:                  [ ] yes  [ ] no

Signed: ______________________   Date: ____________

Then write this record to: docs/evidence/DEC-05.md
```

Only that Daniel-authored file may move `DEC-05` off `MISSING`.
