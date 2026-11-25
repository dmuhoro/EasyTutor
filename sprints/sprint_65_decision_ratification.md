# Sprint 65 — Decision ratification layer for the three `readiness:next` rows

## Directive and its flaw

The directive asked to (a) take V1-POLYMATH and WORLD-CLASS from below 50 % to
60 %, and (b) execute `readiness:next`: C45 staging → DEC-02 → DEC-03.

Both parts have a provable blocker, stated before any edit:

- **60 % is unreachable by agent work alone.** With weights P0 3 / P1 2 / P2 1
  and status scores CI 1 / LOCAL 0.6 / UNPROVEN 0.3 / PARTIAL 0.2 / MISSING 0:
  - V1-POLYMATH is 44.00 / 104 = 42.3 %. Target 62.40 needs **+18.40**.
    All remaining *agent-owned* rows together are worth only **+10.20**.
  - WORLD-CLASS is 29.00 / 118 = 24.6 %. Target 70.80 needs **+41.80**.
    All remaining *agent-owned* rows together are worth only **+36.00**.
  Even perfect agent execution cannot cross 60 % on either milestone. The
  balance is Daniel-only infrastructure (`D02`, `D03`, `D10`, `D15`) and
  decisions (`DEC-01`, `DEC-02`, `DEC-05`).
- **All three `next` rows are blocked by owner, not by code.** `C45`'s acceptance
  is `test -f docs/evidence/daniel-D03.md`; `DEC-02` and `DEC-03` are
  `owner: both` decisions. `supabase projects list` returned
  `Invalid access token`, and `docs/ROADMAP-TO-FINAL.md` §(iii) lists cloud
  Supabase/staging and OAuth as Daniel-only.

Per SOP "Say no early, loudly" and Constitution Article I, the work was
re-scoped to the layer that is honestly completable: make ratification
frictionless **without** promoting any gate.

## Spec / real boundary

No production code path was touched. The real boundary here is the evidence
contract: every blocked row's acceptance is a `test -f` gate on a Daniel-owned
file. Writing those files as an agent would be a false gate.

## Change

- `docs/decisions/DEC-01-pilot-size-proposal.md`
- `docs/decisions/DEC-02-curriculum-priority-proposal.md`
- `docs/decisions/DEC-03-performance-targets-proposal.md`
- `docs/runbooks/staging-provisioning.md`

Each decision file carries the register's canonical default, rationale, what
it does *not* decide, and a signature block. Each explicitly states that the
agent did **not** write the gate's evidence path. The runbook orders the
Daniel-only steps (decide → Supabase → Vercel → proxy → auth → live call → key
rotation) and forbids secrets in the repo.

## Verification

No register row promoted. `npm run readiness:check` and `npm run readiness:score`
re-run on the final tree; full gate re-run because docs changes can affect the
readiness and audit steps. Evidence: `docs/evidence/sprint65-decision-proposals.md`.

## Open

V1-POLYMATH 42.3 % and WORLD-CLASS 24.6 % remain below 50 % and nowhere near
60 %; the shortfall is Daniel-only by arithmetic, not by engineering backlog.
E11 remains blocked twice on the unchanged 733,000 B login ratchet. No task was
marked done that is not done.
