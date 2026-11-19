# Evidence — Sprint 23: Authenticated Mathematics Evidence Flow

**Date:** 2026-11-19
**Branch:** `feat/math-authenticated-evidence-flow` (base `origin/main` @ `493c59d`)
**Spec:** `sprints/sprint_23_math_authenticated_evidence_flow.md`

## What was proven

The live `/math-journey` route (`app/math-journey.tsx` → `screens/math-journey.tsx`)
no longer uses a literal learner ID or a fixed-score button. It now:

1. Reads ownership from `useAuthStore` at the real boundary. Every store mutation
   re-checks `authStore.user.id` and a UUID shape; a caller-supplied ID is refused.
2. Derives the score, dimension, item version and independence flag from the
   real `MATH_DIAGNOSTIC_BANK` answer key and the learner's typed answer, not from
   UI-supplied numbers.
3. Queues evidence locally in `EvidenceRecord` outboxes partitioned per learner,
   and syncs through the existing injected `EvidenceWriter` port. The production
   default is `supabaseEvidenceWriter`, which calls `auth.getUser()` and rejects
   `userId !== data.user.id` before any insert (`src/infrastructure/evidence/supabaseEvidenceWriter.ts:44-79`).
4. Rejects a repeated answer to the same diagnostic item, so evidence and mastery
   cannot be inflated by resubmission. The bank has one item per skill; the guard
   lives in `submitAnswer`, the real submission path.
5. Preserves recorded evidence when another diagnostic is started, so progress is
   not silently dropped from the canonical projection.
6. Renders the canonical learner-state projection (mastery, evidence count,
   prerequisite gaps, recommendation, sync/error state) from the store instead of
   calculating progress in the screen.

Learner snapshots are keyed by learner ID in the persisted Zustand store with a
migration for the prior flat shape. A newly created store instance rehydrates the
signed-in learner's evidence from AsyncStorage; switching accounts cannot surface
or drain the other account's outbox.

## Fail-first / safeguard evidence

- The original handoff had removed the "answer already recorded" guard from
  `submitAnswer`. Restoring it initially broke two tests that had been adapted to
  resubmit the same item; those tests were corrected to use a second diagnostic
  item rather than deleting the guard. The new adversarial test
  `rejects a repeated answer to the same diagnostic item instead of inflating
  evidence` now fails with the guard removed and passes with it restored.
- `beginDiagnostic` had reset `diagnostic`/`evidence`, dropping prior evidence
  from the active projection. It now carries the recorded arrays forward; the
  existing `records practice evidence and preserves history` test enforces this.
- No threshold, matcher, skip or budget was loosened to obtain green.

## Commands and exact results

| Command | Result |
|---|---|
| `npx vitest run -c vitest.config.js tests/domain/mathJourneyStore.test.ts tests/flows/mathLearnerJourney.integration.test.ts tests/flows/mathAuthenticatedEvidence.test.tsx` | ✅ 3 files / 16 tests passed |
| `npm run typecheck` | ✅ exit 0 (`tsc --noEmit`, 0 errors) |
| `npm run lint` | ✅ exit 0 — 0 errors, 166 pre-existing `no-unused-vars` warnings; no warning in any changed file |
| `node scripts/architecture/validate_boundaries.js` | ✅ `[AUDIT PASSED] No architecture violations found.` |
| `npm test` | ✅ 81 files / 457 tests passed (Browserslist staleness notice only) |
| `node scripts/qa/qa_runner.js` | ✅ TypeScript, architecture, governance, flow tests SUCCESS — "All systems verified. Ready for release." (81 files / 457 tests in its flow run) |
| `npx expo export --platform web --output-dir /tmp/easytutor-sprint23-export-493c59d` | ✅ exit 0 — 1,752 modules, 41 web bundles, 37 assets; repo `dist/` untouched |

## Genuinely verified

- Authenticated ownership at the store and at the concrete Supabase writer
  (`auth.getUser()` + identity check before insert).
- Deterministic answer-derived scoring, duplicate rejection, hint independence,
  learner isolation, retry state, and "synced only after writer confirmation".
- Real screen interaction: a typed answer reaches the configured writer with the
  signed-in learner's ID; unauthenticated users see a sign-in state; writer
  failures surface an accessible alert while local evidence stays retryable.
- Reload rehydration through a newly created store over the same AsyncStorage.
- Full repo gate suite, architecture boundaries, QA runner and web export.

## Not claimed

- No live Supabase project, provider credential, physical device, or browser E2E
  run in this sprint. The writer's DB insert and RLS are covered by pre-existing
  `tests/infrastructure/supabaseEvidence.test.ts` and
  `tests/integration/evidenceRls.integration.test.ts`, not re-run against a cloud
  instance here.
- No migration of other subjects, no new progress store, and no change to portal
  scoping or the governed database layer.

## Next recommended engineering task

Read the canonical learner-state projection from `/math-journey` into the
learner-facing progress dashboard so mastery, prerequisites and next steps are
shown from one authoritative source rather than recomputed by each screen.
