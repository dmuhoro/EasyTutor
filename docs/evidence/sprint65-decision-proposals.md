# Sprint 65 — evidence: proposals are not promotions

## The two numbers that decide the directive

Scoring rule (`docs/readiness/register.json` → `scoring`):
`score = Σ(status_weight × priority_weight) / Σ(priority_weight)`;
status weights `VERIFIED-IN-CI 1`, `VERIFIED-LOCAL 0.6`,
`IMPLEMENTED-UNPROVEN 0.3`, `PARTIAL 0.2`, `MISSING 0`;
priority weights `P0 3`, `P1 2`, `P2 1`.

| Milestone | Now | Numerator / denominator | 60 % target needs | Max from all remaining agent-owned rows | Gap that only Daniel can close |
|---|---|---|---|---|---|
| V1-POLYMATH | 42.3 % | 44.00 / 104 | +18.40 weighted pts | **+10.20** | 8.20 pts = 7.9 pp |
| WORLD-CLASS | 24.6 % | 29.00 / 118 | +41.80 weighted pts | **+36.00** | 5.80 pts = 4.9 pp |

Derived mechanically from the register; no weight, threshold or budget was
changed to obtain these figures.

## Gap reduction against the user's baselines (50 % threshold)

| Milestone | Baseline | Gap to 50 % | Current | Gap closed | % of gap closed |
|---|---|---|---|---|---|
| PILOT | 24.4 % | 25.6 pp | 55.8 % | 31.4 pp | 122.7 % (surpassed) |
| V1-ACADEMIC | 15.0 % | 35.0 pp | 50.3 % | 35.3 pp | 100.9 % (surpassed) |
| V1-POLYMATH | 14.4 % | 35.6 pp | 42.3 % | 27.9 pp | 78.4 % (7.7 pp left) |
| WORLD-CLASS | 10.5 % | 39.5 pp | 24.6 % | 14.1 pp | 35.7 % (25.4 pp left) |

## The `next` gates were checked, not fabricated

```
C45      acceptance: test -f docs/evidence/daniel-D03.md      owner: agent (mislabelled; gate is Daniel's)
DEC-02   acceptance: test -f docs/evidence/DEC-02.md          owner: both, decision: true
DEC-03   acceptance: test -f docs/evidence/DEC-03.md          owner: both, decision: true
supabase projects list -> Unexpected error retrieving projects: {"message":"Invalid access token"}
```

Agent-created files were placed at `docs/decisions/DEC-0{1,2,3}-*-proposal.md`
and `docs/runbooks/staging-provisioning.md` — deliberately **not** at any gate
path. The three gates therefore remain red. No register status was edited.

## Full gate on the final tree

Recorded in the commit for this slice: typecheck, lint, `npm test`, boundary
validator, governance audit, AI boundary, declared imports, readiness check,
build, QA runner, `audit:full`, `perf:login-route`. The login budget remains
**733,000 B** and the last measured value is **732,974 B PASS**. No threshold,
timeout, weight, budget or assertion was weakened; no test was renamed, skipped
or deleted; no secret was committed or printed.
