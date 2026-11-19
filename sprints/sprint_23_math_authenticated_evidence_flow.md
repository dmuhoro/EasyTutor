# Sprint 23 — Authenticated Mathematics Evidence Flow

## Problem

The Mathematics journey is reachable from `/explore`, but its screen uses a
literal learner ID and creates fixed-score evidence from a button press. The
store queues that evidence locally but the route never invokes the existing
Supabase evidence writer. The domain/store tests therefore do not prove that a
real learner answer is attributed and persisted through the authenticated
boundary.

## Scope

Complete one Mathematics vertical slice using the existing domain, outbox, and
evidence-writer abstractions:

1. Derive learner ownership from the authenticated session; callers cannot
   supply an owner ID.
2. Collect an answer to a real Mathematics diagnostic item and derive evidence
   score/dimension from the item and answer rather than a UI-supplied score.
3. Preserve local-first evidence and sync it through the existing Supabase
   writer, which verifies `auth.getUser()` before persistence.
4. Show authentication, assessment, recommendation, and sync/error states on
   the Mathematics route.
5. Prove deterministic scoring, session ownership, real screen interaction,
   and writer-confirmed sync with focused tests.

## Acceptance criteria

- Unauthenticated learners cannot start or submit a Mathematics assessment.
- A caller cannot attribute evidence to a different learner by supplying an ID.
- A newly created store instance rehydrates the learner's evidence from
  AsyncStorage without surfacing it to a different account.
- A correct/incorrect answer produces the corresponding deterministic score.
- A repeated answer to the same diagnostic item is rejected, so evidence and
  mastery cannot be inflated by resubmission.
- Evidence remains locally queued after a failed write and is marked synced only
  after the writer confirms persistence.
- The screen exposes the recommendation and pending/failed/synced state from
  the canonical store projection.
- Existing portal, data-governance, and other learner journeys remain unchanged.
- Focused tests, typecheck, lint, boundary audit, relevant full suite, and web
  build results are recorded before the sprint is considered complete.

## Exclusions

This sprint does not claim live cloud, physical-device, or broad browser E2E
verification. It does not migrate other subjects or replace the existing
progress stores.

## Result — 2026-11-19

Delivered on branch `feat/math-authenticated-evidence-flow` from `493c59d`.
Gates: focused 16/16, full suite 81 files / 457 tests, typecheck 0 errors,
lint 0 errors (166 pre-existing warnings), boundaries 0 violations, QA runner
SUCCESS, web export exit 0 to `/tmp` (1,752 modules). Exact commands, fail-first
notes and limitations: `docs/evidence/sprint23-math-authenticated-evidence.md`.
A duplicate-answer guard was restored in `submitAnswer` after review found it had
been removed; `beginDiagnostic` now preserves recorded evidence so starting a new
assessment cannot silently drop learner progress.
