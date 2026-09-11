# ADR 006: Database Governance Layer

## Status
Accepted

## Context
Sprint Omega.2 requires portal isolation and taxonomy ownership to be enforced below UI and feature code. Existing Supabase access was scattered across app, store, and library modules, which made governance dependent on developer discipline.

## Decision
Create `src/infrastructure/database` as the approved database governance layer. Governed reads require `portal_type` before building a query. Governed writes stamp `user_id`, `portal_type`, and `updated_at`, then validate canonical ownership before persistence. Retrieval now requires a full governed context object before vector search.

## Consequences
- New database access should use governed query/write helpers instead of raw Supabase calls.
- Legacy raw Supabase access remains visible through `scripts/architecture/governance_audit.js` warnings and must be migrated in later Omega.2 units.
- Tests and background sync paths must pass explicit portal ownership when ambient portal state is unavailable.
