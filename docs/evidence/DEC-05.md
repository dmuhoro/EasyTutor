# DEC-05 — AI budget (DELEGATED RATIFICATION)

**Authority:** owner message in this session delegated the rows tagged `Daniel-only`;
follow-up answer selected **"Use proposed defaults"** and **"derive what I can, mark
the rest open"**.
**Actor:** agent, under that explicit delegation.
**Executed at:** 2026-11-27T16:33:15Z
**Register:** `DEC-05`, owner `both`, `depends_on: [D07]`, gate
`test -f docs/evidence/DEC-05.md`.

## Decision recorded

- **200 calls per user per day** and **1000 output tokens per call** — these are
  the values already enforced in `supabase/functions/ai-proxy/handler.ts`
  (`DAILY_LIMIT`, `MAX_OUTPUT_TOKENS`), so this ratifies the live behaviour
  rather than changing it.
- Budget for **10 learners**; re-plan at **25**.
- **$0 committed spend** until a provider tier is confirmed.
- Add a **global daily cap** and a **visible degrade message** so a shared quota
  cannot be exhausted silently.

## Verified vs open

The per-user cap and token ceiling were read in the deployed handler source and in
`docs/evidence/sprint86-g07.md`. The **global** daily cap and visible degrade are
**proposed, not present** in code — this decision authorises them but does not
claim they exist. Provider tier, token/day allowance and billing dashboard are
`D07`/`D15` and remain **UNVERIFIED**; no free-tier number is asserted here.

## Not claimed

No spend figure, provider tier or capacity claim is made. `docs/evidence/daniel-D16.md`
records that provider-plan sign-off is withheld for that reason.
