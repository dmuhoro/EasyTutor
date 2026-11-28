# D07 — Groq account limits (owner supplied)

**Executed:** 2026-11-28 under the owner's explicit delegation for the Daniel-only
rows (`D11` excluded). The owner pasted values read from the Groq limits page for
the selected model. No key, token, secret value, billing field or learner data is
recorded here.

## Owner-supplied facts

Source: owner message quoting the Groq limits page, 2026-11-28.

| Field | Value |
|---|---|
| Model shown on the limits page | `openai/gpt-oss-120b` |
| Requests per Minute | 30 (Org limit: 30) |
| Requests per Day | 1,000 (Org limit: 1,000) |
| Tokens per Minute | 8,000 (Org limit: 8,000) |
| Tokens per Day | 200,000 (Org limit: 200,000) |

The excerpt did **not** contain a plan/tier label, so no plan name is claimed.
These are organisation-level limits for the displayed model, not a measurement of
current usage. Groq's published rate-limit documentation states that exact limits
are read from this account page and that cached tokens do not count toward limits.

## What this proves and what it does not

- Proves: account-specific RPM/RPD/TPM/TPD for `openai/gpt-oss-120b` on this org.
- Does not prove: the tier/plan name, the limits for the models the app currently
  calls, or that a live EasyTutor call has succeeded. `D05` remains open.
- The live app allowlist is `llama-3.1-8b-instant` and `llama-3.3-70b-versatile`
  (`src/config/registry.ts:57-62`, mirrored in
  `supabase/functions/ai-proxy/handler.ts:19-24`). `openai/gpt-oss-120b` is **not**
  allowed by the current proxy. These limits therefore cannot be applied to the
  live rail until a separate spec changes both allowlists with red/green proof.

## Capacity consequence (fail-closed arithmetic)

The proxy enforces 200 calls/user/day and caps output at 1,000 tokens/call
(`supabase/functions/ai-proxy/handler.ts:23-24`). If every call emitted the full
1,000 tokens:

- 200,000 TPD ÷ 1,000 tokens = **200 calls/day organisation-wide**.
- At 10 learners that is **20 calls/learner/day**, ten times below the ratified
  200/learner/day assumption in `DEC-05`.
- At 100 learners it is **2 calls/learner/day**.
- 8,000 TPM ÷ 1,000 tokens = **8 calls/minute**, so 30 RPM is not reachable at
  1,000 tokens/call.
- Input tokens also count toward TPM/TPD, so real capacity is lower than the
  output-only arithmetic above.

`E16-T1` remains open; its acceptance script `scripts/ops/capacity_model.mjs` is
not present in this tree. No budget, cap or threshold was changed by this record.

## Gate

This file satisfies `test -f docs/evidence/daniel-D07.md`. The register row was
moved from `MISSING` to `VERIFIED-LOCAL` with this file added to its evidence list,
in the same docs change. It is not `VERIFIED-IN-CI`: a dashboard-read fact cannot
be observed by CI. No product code, test, matcher, timeout or budget changed.
