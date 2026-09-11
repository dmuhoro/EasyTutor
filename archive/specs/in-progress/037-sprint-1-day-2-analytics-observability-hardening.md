# Spec 037: Sprint 1 Day 2 — Analytics & Observability Hardening

## Status: VERIFIED COMPLETE

## Goal
Eliminate operational blindness. Instrument all critical user journeys and AI calls so that every roadmap generation, quiz attempt, provider failure, and retention event is durably recorded — even offline.

## Non-Negotiables
- No third-party analytics SDKs
- Never throw errors in analytics code paths
- All analytics calls are fire-and-forget (void)
- Offline queue capped at 100 events, FIFO
- Offline queue flushed on app foreground
- ai_call_logs persisted from reliability.ts
- Reuse existing patterns; no parallel systems

## Scope

### Phase 1: Database Migration
- Create `ai_call_logs` table in Supabase with RLS

### Phase 2: Offline Analytics Queue
- Extend `lib/analytics.ts` with AsyncStorage-backed offline queue
- Queue flush triggered on foreground / manual flush
- Add new AnalyticsEvent types for auth, portal, quiz, roadmap

### Phase 3: AI Call Log Persistence
- Surgically inject `logAICall()` at the success/failure return points of `executeWithReliability`

### Phase 4: Event Instrumentation
- AUTH: signed_up, signed_in, signed_out, onboarding_completed
- PORTAL: portal_switched
- APP: app_foregrounded
- ROADMAP: roadmap_generation_started, roadmap_generation_completed, roadmap_generation_failed
- QUIZ: quiz_started, quiz_completed, quiz_generation_failed, quiz_abandoned

### Phase 5: Offline Queue Flush Hook
- `useAnalyticsFlush` hook that triggers on AppState 'active'

## Implementation Notes (2026-05-27)
- Hardened `flushAnalyticsQueue` to be partial-failure safe:
  - preserves failed events
  - clears only fully successful sends
  - keeps FIFO cap at 100 via `analytics_queue`
- Normalized event instrumentation to the allowed Day 2 vocabulary:
  - `user_registered`
  - `portal_selected`
  - `session_started`
  - `session_ended`
  - `roadmap_generated` (with `duration_ms`)
  - `quiz_started`
  - `quiz_completed`
  - `quiz_score_recorded`
- Extended reliability AI telemetry persistence without restructuring wrapper flow:
  - ensured fire-and-forget `void logAICall(...)`
  - added `portal`, `model`, `error_code`, and token estimates in metadata where applicable
- Hardened migration idempotency for `ai_call_logs` insert policy creation (`DO $$ IF NOT EXISTS ... $$`).

## Verification
- `node scripts/architecture/validate_boundaries.js` → 0 violations
- `node scripts/qa/qa_runner.js` → all steps pass
- TypeScript clean
- `npm run test` (full Vitest) → pass

## Audit Trail
- Implemented by: Codex (GPT-5)
- Initial implementation date: 2026-05-24
- Hardening completion date: 2026-05-27
