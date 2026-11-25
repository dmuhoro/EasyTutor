# Sprint 51 — governed intelligence writes and a fail-closed audit

## Real boundary

Seven learning-intelligence engines had raw Supabase table access:

- `lib/trendEngine.ts`
- `lib/recommendations.ts`
- `lib/performanceEngine.ts`
- `lib/interventionEngine.ts`
- `lib/learningCoachEngine.ts`
- `lib/questionBank.ts`
- `lib/ai/providerResolver.ts` and `lib/ai/providers.ts` (auth-session reads only)

Reads and writes in the first six files now go through
`lib/governedIntelligence.ts`, which resolves the portal with
`portalFromMode(getActiveLearningMode() ?? 'high_school')`, builds only
portal-scoped queries, and stamps owner/portal through `executeGovernedWrite`.
Auth-session reads were left at the Supabase boundary; they are not data access.
No fallback silently downgrades to an ungoverned query: without a client the
helper throws and the caller records the failure through the existing logger.

## Gate hardening

`scripts/architecture/governance_audit.js` now exits 1 on any raw `.from(` or
`.rpc(` access outside the approved boundary, including chains through
`getSupabaseClient()`. It no longer merely warns. Auth-only
`getSupabaseClient().auth.getSession()` is allowed by design; a direct table
chain through the same getter is rejected.

`tests/architecture/governanceAudit.gate.test.mjs` proves three cases:

1. an injected `supabase.from(...)` in a feature file is rejected;
2. an injected `getSupabaseClient().from(...)` in a feature file is rejected;
3. an auth-only getter call passes.

The approved allowlist is unchanged. This proves enforcement outside that
boundary, **not** that every legacy file in the allowlist has been migrated;
that larger migration remains open.

`.github/workflows/ci.yml` now runs `node scripts/architecture/governance_audit.js`
as `Database governance audit`. The three E6/GT-13 rows are promoted only to
`VERIFIED-LOCAL`; `VERIFIED-IN-CI` awaits a pushed green run of this branch.

## Budget

The first implementation exceeded the login JS transfer ratchet by 313 B. No
threshold was raised. The helper was reduced to positional arguments and one
cast point, and verbose object keys at six call sites were removed. Final
measurement on the real export:

```
__expo-metro-runtime-*.js   1,893 B
__common-*.js             306,577 B
entry-*.js                424,511 B
total                     732,981 / 733,000 B  PASS
```

Baseline before this slice was 732,983 B; the governed path is 2 B smaller.

## Gates (local)

typecheck 0; lint 0 errors / 129 warnings; `npm test` 109 files / 583 tests;
boundaries 0; governance audit 0; AI boundary PASS; imports PASS; readiness
check 0; `npm run build` 0; login route 732,981 / 733,000 B PASS; QA runner
SUCCESS; `npm run audit:full` 0 (`audits/full-audit-2026-11-25_11-52-45.txt`).
Scores remain local-only: PILOT 53.0 %, V1-ACADEMIC 35.7 %, V1-POLYMATH 35.8 %,
WORLD-CLASS 21.9 %; all `READY=NO`.
