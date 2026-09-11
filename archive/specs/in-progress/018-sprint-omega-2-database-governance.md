# Spec 018: Sprint Omega.2 Database Governance

## Status
In Progress

## Objective
Move EasyTutor governance from architectural convention into executable infrastructure contracts. This unit covers the first sprint priority: database governance, portal isolation, taxonomy ownership validation, and the retrieval contracts needed by the database layer.

## Scope
- Create governed database infrastructure under `src/infrastructure/database`.
- Require `portal_type` for governed reads, writes, retrieval, sync, recommendations, and mastery data access.
- Enforce canonical taxonomy ownership before persistence or retrieval.
- Preserve the legacy `lib/supabaseOps.ts` surface as a proxy only.
- Add governance audits and contract tests for raw Supabase access, portal filters, taxonomy validity, and retrieval context shape.

## Non-Goals
- No cosmetic UI changes.
- No screen redesigns.
- No speculative product features.
- No database migration rewrites.

## Acceptance Criteria
- All new database access paths require a `PortalType`.
- Governed query builders reject missing portal context immediately.
- Writes validate portal type and canonical taxonomy scope before reaching Supabase.
- Retrieval requests require an explicit context object.
- Architecture audits detect raw Supabase calls outside approved infrastructure files.
- QA runner and boundary validation pass or failures are documented with remediation.

## Audit Trail
- 2026-05-12: Spec created from Sprint Omega.2 directive because `/specs/in-progress` was empty and repository invariants require a spec before code changes.
- 2026-05-12: Added governed database modules for reads, writes, portal filters, taxonomy guards, and retrieval policies.
- 2026-05-12: Refactored progress, quiz, sync, ingestion, and retrieval entry points to use explicit portal governance contracts where touched.
- 2026-05-12: Added governance audit automation and contract tests for portal filters, canonical ownership, and retrieval context enforcement.
- 2026-05-12: Verification passed via `node scripts/qa/qa_runner.js` with TypeScript, architecture validation, governance audit, and 77 flow tests green.
