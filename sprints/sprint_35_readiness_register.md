# Sprint 35 — Completion Register (R0)

## Context

Daniel's directive: before executing Wave 1, make completeness and readiness measurable and
provable, then drive all four milestones to ≥80%. Ground truth is
`docs/evidence/ground-truth-2026-11-24.md`; ordering is `docs/ROADMAP-TO-FINAL.md`. Both were
confirmed present on `origin/main` (`859b9dc`) before any work began.

## Spec / boundary

- Constitution Article I and VI: no claim without a command; proof must exercise the real
  path. The register is therefore validated by a script in CI, not maintained by hand.
- No budget, timeout, threshold or assertion was changed. The existing 80% rule and the
  status/priority weights are fixed in code.
- One branch per epic from `origin/main`, one concern per commit, hooks on.

## Work done

1. Seeded `docs/readiness/register.json` with **153 rows**: 49 capability rows, 24 GT defects,
   F1–F8, all E1–E16 task rows, 16 Daniel-only steps, 5 DEC decisions, and the R0 row itself.
   Every row carries id, title, milestones, priority, status, evidence, acceptance, owner, epic,
   wave and `depends_on`. Explicit v1 non-goals are recorded.
2. Built `scripts/readiness/score.mjs`: schema validation, duplicate-id detection, dependency
   cycle detection, F1–F8 coverage enforcement, evidence-path existence checks for every
   `file:`/`test:` reference, `run:` URL requirement for `VERIFIED-IN-CI`, acceptance-command
   checks for P0, deterministic scoring, `next` scheduling and `docs/READINESS.md` generation.
3. Added `readiness:check`, `readiness:score`, `readiness:next` scripts and a fast CI step.
4. Added `tests/readiness/score.test.mjs` (6 cases) exercising the real CLI against throwaway
   fixtures. The arithmetic case pins 1.20/6 = 20.0%; negative cases prove the gates reject
   duplicate ids, cycles, missing F coverage, unverifiable VERIFIED rows, missing acceptance
   commands and a stale generated file.
5. Generated `docs/READINESS.md`; `STATUS.md` now has a single pointer line.

## Evidence (commands run)

- `npm run readiness:score` → exit 0, wrote 153 rows to `docs/READINESS.md`.
- `npm run readiness:check` → exit 0, "Readiness register valid (153 rows); READINESS.md is current."
- `npx vitest run -c vitest.config.js tests/readiness/score.test.mjs` → 6/6 pass.
- `node scripts/readiness/score.mjs next` → used to confirm ordering.

Baseline arithmetic (computed by the script):

| Milestone | Numerator / Denominator | Score | Open P0 | Critical path not CI | READY |
|---|---|---|---|---|---|
| PILOT | 36.00 / 241 | 14.9% | 31 | 15 | NO |
| V1-ACADEMIC | 3.00 / 111 | 2.7% | 18 | 10 | NO |
| V1-POLYMATH | 10.10 / 104 | 9.7% | 13 | 7 | NO |
| WORLD-CLASS | 9.60 / 118 | 8.1% | 13 | 8 | NO |

## Honest handover

Safe now: the register is machine-checkable, cannot silently drift, and any agent can resume
from `readiness:next`. Still open: every milestone is far below 80%, 15–31 P0 rows are open,
and no critical-path row is `VERIFIED-IN-CI`. Most importantly, the register is a *measuring
instrument* — it does not itself close a single defect. Wave 1 execution starts with E1.
