# Sprint 51 — governed intelligence writes

## Scope

One governed slice on `feat/governed-intelligence-writes`: move learning-intelligence
table access behind the real database boundary and make the governance audit fail
closed. No UI/visual work, no threshold, budget, timeout or assertion change.

## What changed

- Added `lib/governedIntelligence.ts`. Reads resolve the active portal through
  `portalFromMode`, defaulting conservatively to `high_school`; writes stamp owner
  and portal through `executeGovernedWrite`. Missing Supabase client throws instead
  of degrading to an ungoverned path.
- Routed trend snapshots, recommendations, performance profiles, interventions,
  coach reports and question-bank/practice-session access through that boundary.
  Auth-session reads in the AI resolver remain at the Supabase boundary.
- Hardened `scripts/architecture/governance_audit.js` from warning-only to exit 1,
  including the `getSupabaseClient().from(...) bypass. Added three gate tests,
  two of them injected-defect negative controls.
- Added the governance audit to CI and promoted E6-T1, E6-T2 and GT-13 only to
  `VERIFIED-LOCAL`. CI proof is pending a pushed run.
- Kept the login route at 732,981 / 733,000 B by shortening the helper signature
  instead of raising the budget.

## Verification

Full local gate green: typecheck 0, lint 0 errors, tests 109 files / 583 tests,
boundaries 0, governance 0, AI boundary PASS, imports PASS, readiness 0, build 0,
login budget PASS, QA SUCCESS, `audit:full` 0. Evidence:
`docs/evidence/sprint51-governed-intelligence.md`.

## Open

Allowlisted legacy modules still contain raw Supabase access and are outside this
slice's claim. CI has not yet executed the new audit step. The remaining readiness
gaps are countdown (C28/GT-04/E9), duplicate mastery (E11/GT-06), remaining
canonical consumers (E10-T2), C20/GT-14, C21, C23, C13, i18n/raw-hex/a11y,
capacity model and Daniel-blocked live/staging/decision evidence.
