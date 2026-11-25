# Sprint 72 — AI-proxy auth and cap proof

## Spec / real boundary

Row `C11` was `IMPLEMENTED-UNPROVEN`: `npm run check:ai-boundary` proves no
direct client rail but not the proxy's JWT validation, per-learner cap
attribution or 429 refusal. The real boundary is
`supabase/functions/ai-proxy/handler.ts`.

## Change

- Added `tests/flows/aiProxy.authCap.test.ts` (6 tests) exercising the real
  handler with only the network socket stubbed.
- Repointed C11 acceptance from the ineffective boundary grep to the real test.
- Updated the tracked suite count from 113 files / 605 tests to 114 files / 611
  tests in `AGENTS.md`, the CI drift gate and GT-21.

## Outcome

Green on shipped code (`6 passed`); red negative control when the cap check is
removed (`1 failed / 5 passed`), handler restored clean. C11 promoted to
`VERIFIED-LOCAL`. Live Groq validity is not claimed (D05 remains open).

Evidence: `docs/evidence/C11.md`.
