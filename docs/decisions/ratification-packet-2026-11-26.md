# Ratification packet — 2026-11-26

**For:** Daniel · **From:** agent · **Status:** AWAITING OWNER ACTION · nothing in this packet is ratified

Three `both`-owned decisions are unblocked and can be ratified without code.
Together they are worth **+7 points** in each of `V1-POLYMATH` (44.0 % → 50.8 %)
and `WORLD-CLASS` (29.2 % → 35.1 %). They do not by themselves make any milestone
`READY` — that still requires 80 %, zero open P0 rows and every critical-path row
proven in CI.

> **Do not create the evidence files below before deciding.** Each file is the
> ratification record itself. Writing one now would satisfy a file-existence
> check without a decision, which this repo treats as a false gate.

| ID | Canonical default | Proposal | File you write | Gate | Weight |
|---|---|---|---|---|---|
| `DEC-02` | KCSE first, then Kenya TVET automotive, then one university pack; Daniel reviews | `docs/decisions/DEC-02-curriculum-priority-proposal.md` | `docs/evidence/DEC-02.md` | `test -f docs/evidence/DEC-02.md` | +3 (P0) |
| `DEC-03` | Keep existing budgets; add a mobile Lighthouse floor of 60 after a measured baseline, ratchet to 80 later | `docs/decisions/DEC-03-performance-targets-proposal.md` | `docs/evidence/DEC-03.md` | `test -f docs/evidence/DEC-03.md` | +2 (P1) |
| `DEC-04` | PWA for pilot, signed APK for device proof, Play Store deferred | `docs/decisions/DEC-04-pwa-vs-apk-vs-play-store-proposal.md` | `docs/evidence/DEC-04.md` | `test -f docs/evidence/DEC-04.md` | +2 (P1) |

## What to do

1. Read the linked proposal. Each contains a short ratification record.
2. If you accept the default, copy the record into the named `docs/evidence/`
   file, tick the boxes, sign and date it. If you choose differently, write the
   alternative decision in that same file — the gate proves the file exists, not
   that you picked the default.
3. Commit and push your signed files (or hand them to the agent to commit for
   you). No secret values belong in these files.

## What happens after each file lands

The agent will promote **only that row** to `VERIFIED-IN-CI`, on an exact pushed
green CI run that observes the new file, and will record the run URL in
`docs/readiness/register.json` and `STATUS.md`. No row moves before that run.

## Deliberately not in this packet

- `DEC-01` (pilot size) — blocked on `D16`.
- `DEC-05` (AI budget) — blocked on `D07`.
- `D03`, `D05`, `D10` (staging Supabase, live AI call, production Auth URLs) —
  Daniel-only critical-path rows, still open.
- `C45` staging environment — blocked on `D03`.

Current generated scores: PILOT **64.1 %**, V1-ACADEMIC **53.7 %**,
V1-POLYMATH **44.0 %**, WORLD-CLASS **29.2 %**; all `READY=NO`.
