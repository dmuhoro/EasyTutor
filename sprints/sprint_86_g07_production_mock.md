# Sprint 86 — G-07 production mock refusal (spec addendum)

**Parent spec:** `sprints/sprint_86_pilot_ready.md` WS2
**Real boundary:** `src/infrastructure/database/index.ts` — `Database.getClient()`
**Written before code.**

## Premise verified before edit

`Database.getClient()` returned `globalThis.__MOCK_SUPABASE_CLIENT__` before it
checked the real client. `tests/setup.ts:56` installs that global for every
vitest file, so the production submission/governance path could be served by a
test double. A guard placed in a helper or in a test would be a false gate.

## This unit

1. One runtime resolver in `Database.getClient()`:
   - production refuses both an injected mock and a missing real client;
   - `NODE_ENV=test` or `VITEST` keeps the existing test seam;
   - `EASYTUTOR_ALLOW_MOCK=1` is honoured only in development and never in
     production.
2. A typed `BackendUnavailableError` with the `[BACKEND UNAVAILABLE]` prefix.
   Callers get a reason, never a silent empty success.
3. The existing blocking `GlobalErrorBoundary` becomes the accessible service
   unavailable surface: `accessibilityRole="alert"` on the title, a truthful
   "Service unavailable" message, and an accessible Retry button. No new
   component, locale key or route is added.
4. Pre-registered red control: with `NODE_ENV=production` and an injected
   sentinel, the current code returns the sentinel and the new test fails.
5. Suite ratchet updated in the same change (118 files / 624 tests in
   `AGENTS.md`, `README.md` and the CI grep) because two tests were added. No
   threshold, matcher, timeout or budget is raised.

## Non-goals

- No readiness row promoted in this code change.
- No mock is removed from the test runtime; the seam is scoped, not deleted.
- No `docs/evidence/DEC-0N.md` or `daniel-D0N.md` file is created.
- No other governed query or write behavior changes.

## Order

Spec → red control → boundary fix → green control → full gate → code PR →
exact pushed green CI → separate docs promotion PR.
