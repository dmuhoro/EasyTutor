# D09 — Vercel plan and egress limits

**Executed:** 2026-11-27 by the agent under the owner's explicit delegation for
Daniel-only rows (`D11` excluded). No token, secret value, billing address,
email or learner data is recorded here.

## Plan observed

Read-only `vercel api /v1/teams/team_sGSR187e4tniaRMCYJ8yb0JG`, selecting only
non-personal fields:

- `slug`: `dmuhor01`
- `billing.plan`: `hobby`
- `billing.planIteration`: `legacy`
- `billing.status`: `active`

The Vercel MCP connection still returned HTTP 403 for this scope; the
authenticated CLI fallback succeeded. No new scope approval was requested.

## Published limits for that plan

Source: <https://vercel.com/pricing>, fetched 2026-11-27.

- Fast Data Transfer: **100 GB / month included** on Hobby.
- CDN Requests: **1M / month included** on Hobby.
- Fast Origin Transfer: **10 GB / month included** on Hobby.

These are published plan limits, not measured current usage.

## Not claimed

- No current usage or egress consumption was measured; only the plan
  entitlement and published limit are recorded.
- This file satisfies the file-existence acceptance command
  `test -f docs/evidence/daniel-D09.md`. Register promotion still requires the
  separate docs PR and pushed green CI specified in
  `sprints/sprint_86_pilot_ready.md`.
