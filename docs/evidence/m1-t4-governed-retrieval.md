# M1 T4 — governed retrieval ownership

## Change

- `src/infrastructure/database/index.ts` now owns retrieval reads:
  - `Database.governedRetrieval()` resolves the active portal, refuses a
    policy whose portal does not match, asserts an authenticated owner, then
    invokes the permitted RPC.
  - `Database.governedChapters()` builds the chapter read through
    `buildPortalScopedQuery()` with the resolved portal and authenticated user
    id, plus the `taxonomy_scope` filter.
- `lib/retrieval.ts` no longer imports or calls `getSupabaseClient`; both vector
  and FTS RPCs and the chapter picker go through the governed layer.
- `screens/tabs/study.tsx` catches a refused chapter read and fails closed to
  an empty picker instead of producing an unhandled rejection.

## Proof

`tests/flows/governedRetrievalOwnership.m1.test.ts` (4 tests) proves:

- chapter reads carry `user_id`, `portal_type`, `curriculum_scope` and
  `taxonomy_scope` filters;
- switching learners changes the owner filter from learner A to learner B and
  never reuses learner A's scope;
- a high-school retrieval policy is refused when the resolved portal is
  university;
- retrieval is refused when `auth.getUser()` returns no user.

`tests/flows/polymath.flow.test.ts` was adapted by setting the active portal
context in the governance test's `beforeEach`; no assertion was weakened.

## Commands run this session

- `npm run typecheck` → 0 errors.
- `npx vitest run tests/flows/governedRetrievalOwnership.m1.test.ts` → 1 file / 4 tests passed.
- `npx vitest run tests/flows/retrieval.scope.contract.test.ts tests/flows/import.noEmbeddings.test.ts tests/flows/postHardeningLoop.test.ts tests/flows/polymath.flow.test.ts` → 4 files / 14 tests passed.
- `npx vitest run tests/flows/ollama.offline.test.ts tests/smoke/routes.smoke.test.tsx` → 2 files / 46 tests passed.
- `node scripts/architecture/validate_boundaries.js` → `[AUDIT PASSED] No architecture violations found.`
