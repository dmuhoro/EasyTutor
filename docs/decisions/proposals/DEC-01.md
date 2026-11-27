# DEC-01 — Pilot size (PROPOSAL · NOT RATIFIED)

**Status:** agent-prepared for Daniel · **NOT VERIFIED** · **no evidence file exists**
**Register row:** `DEC-01` · P0 · `owner: both` · `depends_on: [D16]` · gate `test -f docs/evidence/DEC-01.md`
**Full background:** `docs/decisions/DEC-01-pilot-size-proposal.md`

> The agent does **not** create `docs/evidence/DEC-01.md`. That would make the
> file-existence gate pass without a decision — a false gate (Constitution Art. I).

## Question

How many learners, which subjects and which platforms are in the first real-world pilot?

## Recommended default

**10 learners · Mathematics only · Android + web · 7 days**, reviewed at day 7.
Expansion to 30 requires a separate decision after the review shows zero open P0 rows.

## Data

- Register `recommended_default`: *10 learners, Mathematics only, Android + web*.
- `cost_of_delay`: *Each extra 10 learners needs a provider tier decision; delay blocks D16 and the pilot gate.*
- Mathematics is the only subject with the complete governed pack chain; `E12`
  (second subject) is proven in domain, not in packs.
- `ai-proxy/handler.ts` already enforces `DAILY_LIMIT = 200` per user and
  `MAX_OUTPUT_TOKENS = 1000` — the code matches the DEC-05 default today.
- Web/PWA is gated (`C33`, `C32` `VERIFIED-IN-CI`); Android device proof `D06`
  is `MISSING` and needs Daniel's device session.

## Cost of delay

Every additional 10 learners changes the provider-tier calculation and makes
`D16` (provider/capacity/pilot sign-off) impossible to finalise. The pilot gate
cannot close until the cohort is fixed.

## Paste-ready ratification block (Daniel)

```
DECISION DEC-01 — PILOT SIZE
[ ] accept default: 10 learners / Mathematics only / Android + web / 7 days
[ ] change: learners=____  subjects=____  platforms=____  duration=____

Signed: ______________________   Date: ____________

Then write this record to: docs/evidence/DEC-01.md
```

Only that Daniel-authored file may move `DEC-01` off `MISSING`.
