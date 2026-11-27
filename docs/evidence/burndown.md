# Sprint 86 burn-down — pilot-ready weekend

**Spec:** `sprints/sprint_86_pilot_ready.md`
**Baseline:** `docs/evidence/weekend-baseline.md` · main `74d002c` · tag `v1.16.7`

Append one row at each promotion and at the end of every scheduled block.
A score delta of `0/0/0/0` with `no` evidence is a valid entry — it records that
a block produced work but no row moved. Never back-fill a row from memory.

| Date/time EAT | Row | From -> To | Score delta (PILOT / ACADEMIC / POLYMATH / WORLD) | Open P0 | CP-not-CI | Evidence (run URL + SHA) | Blocker owner |
|---|---|---|---|---:|---:|---|---|
| 2026-11-27 17:32 | baseline | n/a -> captured | 0 / 0 / 0 / 0 | 8 / 6 / 6 / 7 | 6 / 4 / 4 / 4 | `docs/evidence/weekend-baseline.md`; `npm run readiness:check` on `74d002c` | n/a |

## Daily headline

- **DAY 0 (baseline):** PILOT 68.3% (P0 8, CP-not-CI 6) | ACADEMIC 53.7% | POLYMATH 53.8% | WORLD 44.2% | next blocker: `DEC-02` (Daniel) / `C45` (agent-documented, Daniel-provisioned)

## Promotion rule for every row in this table

A row moves to `VERIFIED-IN-CI` only when all three hold:

1. the proving change is on `origin/main`;
2. CI on that exact SHA is green and its run URL is cited here;
3. `npm run readiness:check` passes on that SHA.

Local-only proof is `VERIFIED-LOCAL`. Daniel-owned rows move only from
Daniel-authored `docs/evidence/daniel-D0N.md` or `docs/evidence/DEC-0N.md`
files; the agent never creates or edits those files.

## Weekend target (not a promotion claim)

PILOT `READY` requires score >= 80%, zero open P0, and every critical-path row
`VERIFIED-IN-CI`. If that is not true at Sunday 16:00 EAT, the handover says so
with exact blockers; no row is redefined to reach the number.
