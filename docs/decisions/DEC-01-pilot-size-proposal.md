# DEC-01 — Pilot size (PROPOSAL, NOT RATIFIED)

**Status:** PROPOSED BY AGENT · AWAITING DANIEL'S WRITTEN RATIFICATION · **NOT VERIFIED**
**Register row:** `DEC-01` (P0, `owner: both`, `depends_on: [D16]`)
**Canonical default:** *10 learners, Mathematics only, Android + web.*

> This file is deliberately **not** at `docs/evidence/DEC-01.md`. The register's
> acceptance gate is `test -f docs/evidence/DEC-01.md`. Writing that file before
> ratification would make a weak file-existence gate pass while the decision has
> not been made — a false gate the Constitution (Article I) forbids. The gate is
> intentionally left red.

## Decision required

| Field | Recommended default | Why |
|---|---|---|
| Cohort size | 10 learners | Keeps hosted-AI spend inside the free/tier-1 envelope; `cost_of_delay` says each extra 10 needs a provider-tier decision. |
| Subject scope | Mathematics only | The only subject with the full governed pack chain (`E12` second subject is proven in domain, not in packs). |
| Platforms | Android + web | PWA for web is already built and gated; Android device proof is the agreed pilot rail (see DEC-04 proposal). |
| Duration | One academic cycle, reviewed weekly | Gives enough mastery events for deterministic and spaced-repetition claims. |

## What ratification unlocks

- `D16` (pilot cohort instrumentation) can be finalised.
- The PILOT milestone's P0 decision gate can close.

## What is still blocked by this decision

- Provider tier and AI budget (`DEC-05`) cannot be fixed until cohort size is known.
- Live learner onboarding cannot start: E2/E4 code is green, but cloud Supabase
  staging (`D03`) and hosted proxy (`D02`) are Daniel-only and not provisioned.

## Ratification record (Daniel to complete)

```
Decision:   [ ] accept default   [ ] change (state values below)
Cohort:     ____   Subjects: ____   Platforms: ____
Signed:     ____________________   Date: ____________
```

When the above is filled in, Daniel writes `docs/evidence/DEC-01.md` with the
signed values. Only then may the register row move off `MISSING`. No agent may
promote it on the strength of this proposal.
