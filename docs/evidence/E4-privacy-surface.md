# E4 — Privacy surface: consent, export, erasure

Branch `fix/e4-privacy-surface` from `origin/main` @ `859b9dc`. No PR opened (two open: #19 R0,
#20 E1). No budget, timeout, threshold or assertion was weakened; no test skipped or deleted.

## The real defect found before wiring UI

`lib/privacy/dataDeletion.ts` called `Database.governedWrite('cached_roadmaps', { user_id }, …)`
on the deletion path. `executeGovernedWrite` only inserts/upserts
(`src/infrastructure/database/governedWrites.ts:63-71`), so "delete" wrote rows and reported
success. Wiring that into Settings would have shipped a false right-to-erasure claim
(Constitution Article I).

### Fix at the boundary

- `Database.governedDelete(table)` (`src/infrastructure/database/index.ts`) resolves the
  authenticated Supabase user, reads the owner column from the canonical `tableGovernance` map,
  issues `delete().eq(ownerColumn, user.id)`, and fails closed for unregistered/shared tables.
  Callers cannot supply a user id, so another learner's rows cannot be targeted.
- `deleteUserData()` now deletes all 24 mutable owner-scoped tables with the client-side DELETE
  policy in `20261104_rls_hardening.sql`, collects per-table failures, writes an explicit audit
  event (`PRIVACY_DELETION_REFUSED` / `FAILED` / `COMPLETE` with an audit id), and clears local
  state **only** when every deletion succeeded. Nothing is silently dropped.
- Append-only tables (`learning_evidence`, `user_events`, `ai_call_logs`) are retained by design:
  UPDATE/DELETE is revoked at the grant layer. The UI and this document say so; erasure is not
  claimed over those audit trails.
- Settings (`screens/settings/index.tsx`, the real `/settings` route) now renders
  `components/privacy/PrivacySection.tsx`: consent switch, export, and a destructive-confirm
  delete. Outcome text surfaces the audit id and any partial failure.

## Red → green proof

| Stage | Command | Result |
|---|---|---|
| Red (before fix) | `npm run test -- tests/flows/privacy.surface.test.ts tests/screens/privacy.settings.test.tsx` | 2 files / 8 tests failed — zero DELETE calls, zero upsert calls expected, `Database.governedDelete is not a function`, no privacy controls on the route |
| Green | same command | 2 files / 8 tests passed |
| Full suite | `npm test` | 94 files / 523 tests passed |

The red run was recorded before implementation (`/tmp/work/e4-red3.log`); the test file was not
weakened to go green. Two test-harness bugs found during the red phase (a `vi.hoisted` reference
to a later constant, and a missing mock for `dataExport`) were corrected in the tests themselves,
not by relaxing an assertion.

## Budget proof (no threshold raised)

Clean baseline on `origin/main` with its exact lockfile: **732,878 B / 733,000 B** PASS
(`/tmp/work/e4-baseline-login2.log`). First E4 build with the privacy copy added to eager
`en.json`: 733,697 B FAIL. Privacy copy was moved to a route-scoped pack
(`src/locales/privacy.json` + `privacyT.ts`), still resolved through `t()` in the component:
**732,862 B / 733,000 B** PASS, below baseline. A polluted `node_modules` (E6 lockfile) briefly
showed 765,561 B; `npm ci` restored this branch's lockfile before all measurements.

## Gates

typecheck 0 · lint 0 errors / 146 warnings · 94 files / 523 tests · boundaries 0 · AI boundary PASS ·
secret exposure PASS · imports PASS · QA runner all systems verified · entry budget PASS ·
login-route budget PASS · governance audit exit 0 (8 pre-existing WARNs, listed below) · build 0.

## Honest handover

DONE: real governed deletion boundary, explicit audit records, reachable settings controls with
destructive confirmation, and tests that fail on the old upsert behaviour. **Open:** 8 governance
WARNs (`lib/ai/providerResolver.ts`, `providers.ts`, `interventionEngine.ts`,
`learningCoachEngine.ts`, `performanceEngine.ts`, `questionBank.ts`, `recommendations.ts`,
`trendEngine.ts`) are pre-existing on `origin/main` and remain E6 scope; E6's 0-WARN acceptance is
not claimed. Daniel-only: legal review of the privacy wording. `VERIFIED-IN-CI` withheld (no PR
slot). No secret printed or committed.
