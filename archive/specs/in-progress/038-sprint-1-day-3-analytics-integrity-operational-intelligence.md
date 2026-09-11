# Spec 038: Sprint 1 Day 3 — Analytics Integrity & Operational Intelligence

## Status: VERIFIED COMPLETE

## Goal
Guarantee analytics trustworthiness under real-world mobile conditions (offline, flaky connectivity, partial failures) and expose queryable operational intelligence for AI telemetry and retention.

## Scope

### Phase 1 — Analytics Integrity Hardening
- Add stable client-side analytics envelope identifiers:
  - `event_id`
  - `created_at`
- Guarantee queue properties:
  - replay-safe
  - duplicate-safe
  - partial-failure-safe
  - bounded (max 100)
  - idempotent flush semantics

### Phase 2 — Persistence Idempotency
- Add server-side idempotency support for `user_events`:
  - `event_id` column
  - unique index `(user_id, event_id)` where `event_id IS NOT NULL`

### Phase 3 — Operational Intelligence Infrastructure
- Add queryable AI telemetry view (`ai_operational_daily`):
  - call counts
  - success/failure counts
  - avg/p95 latency
  - estimated cost totals
- Add retention-ready event offsets view (`retention_event_offsets`):
  - user cohort day
  - active day
  - day offset for D1/D7 retention analyses

### Phase 4 — Verification
- Add integrity tests for queue behavior:
  - event envelope integrity (`event_id`, `created_at`)
  - partial flush recovery
  - duplicate suppression during flush replay

## Verification
- `npm run typecheck` ✅
- `npx vitest run tests/reliability/analyticsIntegrity.test.ts -c vitest.config.js` ✅
- `node scripts/qa/qa_runner.js` ✅
- `npm run test` ✅

## Audit Trail
- Implemented by: Codex (GPT-5)
- Date: 2026-05-27

