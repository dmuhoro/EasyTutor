# Sprint 28 — Deep audit, indexing and canonical completion tracker

Date: 2026-11-22. Branch `docs/completion-tracker` from `origin/main` (`bd46cc4`, release `v1.15.0`).

## Spec (Daniel's directive)

1. Perform a deep, read-only audit and index of the codebase before any further work.
2. Create **one** document that tracks all work: complete, incomplete, and everything
   required to make the product ready for real-world use.
3. Make the product work on three targets: Android phone, web on a phone, web on a
   laptop/desktop.
4. Provide an honest 80/20-compressed estimate of remaining effort.
5. Strategically and tactically plan the remaining work — then execute it in layers.

## Verified premise (before any edit)

Five planning/tracking documents already existed and contradict each other:

| Document | Stale claim |
| --- | --- |
| `docs/ROADMAP-TO-DONE.md` | "ALL EPIC 1-5 COMPLETE", still tells Daniel to push `fix/truth-pass`; 441 tests; 195 B headroom. |
| `docs/product/MASTER_EXECUTION_TRACKER.md` | 14 lines; "Vercel failure — Uninvestigated". |
| `docs/audit/TECHNICAL_DEBT.md` | 131 lint warnings; SDK 55 / RN 0.83.6. |
| `docs/verification/REMAINING_IMPLEMENTATION_PLAN.md` | 8 lines of unscoped intentions. |
| `docs/audit/ROADMAP.md` | 3 lines: "M1: run npm test". |

`STATUS.md` also contains three false/stale claims verified this session:
- `:202` calls `src/infrastructure/evidence/index.ts` unreferenced, but
  `store/mathJourneyStore.ts:5` imports it.
- `:25` reports 85 files / 492 tests for current HEAD; the release commit has 86 / 493.
- `:35` still says all Phase 2 screens are unwired dead code (contradicted by `:134-140`).

Adding a sixth tracker would increase ambiguity. This sprint establishes one canonical
document and marks the five predecessors as historical.

## Method

Four parallel **read-only** audit agents, each on a separate layer, with exact commands
and `file:line` citations: (1) structure/wiring, (2) tech debt, (3) cross-device readiness,
(4) quality gates/CI. Every load-bearing claim was spot-re-verified with a direct command
by the lead agent. Full command/output record: `docs/evidence/2026-11-22-codebase-audit.md`.

No code behaviour changed in this sprint. No `.env*` file was read. No timeout, assertion
or test was weakened.

## Deliverables

1. `docs/COMPLETION_TRACKER.md` — canonical tracker: real-world-ready bar, verified baseline,
   indexed gap register with severity/tier/effort, cross-device matrix, 80/20 plan, today's
   high-leverage tasks, Daniel's manual steps.
2. `docs/evidence/2026-11-22-codebase-audit.md` — reproducible audit record.
3. Superseded headers on the five predecessor documents.
4. `STATUS.md` corrections and a pointer to the tracker; `CHANGELOG.md` and `README.md`
   updated in the same change (Constitution Article VI; personal rule 8).

## Gate scope

Docs-only change; the repository gate set still must be green before commit and PR:
typecheck, lint, tests, boundaries, AI boundary, build, QA runner. Release discipline is
preserved: this documentation upgrade lands through a feature branch and PR, then gets a
version bump, changelog entry, tag and pushed tag like any other shipped change.
