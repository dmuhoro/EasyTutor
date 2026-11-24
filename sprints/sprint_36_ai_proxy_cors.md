# Sprint 36 — CORS for ai-proxy (E1 / GT-01)

## Context

Wave 1 epic 1 of the directive. Ground truth §11 GT-01: the browser cannot call the hosted
AI proxy because non-POST requests get 405 and no CORS headers are set.

## Spec / boundary

- Constitution Article I: verify the premise in code before editing; enforcement belongs at
  the real response boundary. The old `index.ts` was read first.
- Article IV: auth, rate limits, provider allowlist, body and token caps unchanged.
- No visual/UI work. No budget, timeout or threshold changed. No secret values touched.

## Work done

1. Re-verified the 405/no-CORS premise and the client header set.
2. Wrote `tests/flows/aiProxy.cors.test.ts` first and recorded the red run.
3. Added `cors.ts` (exact-match allowlist, no wildcard, `Vary: Origin`) and `handler.ts`
   (production request logic, Web-standard only); reduced `index.ts` to the Deno adapter.
4. Added the `ALLOWED_ORIGINS` name (no value) to `.env.example`.
5. Recorded evidence in `docs/evidence/E1-cors.md`.

## Evidence

- Red: `Cannot find module '../../supabase/functions/ai-proxy/handler'` (exit 1).
- Green: 7/7 new tests; 6/6 existing proxy tests; `check:ai-boundary` PASS.
- Pre-commit hook (typecheck, lint, full test) recorded in the commit log.

## Honest handover

Safe now: the proxy answers preflight and emits CORS on success and every error path, proven
against the real handler in Node. Still open: the deployed secret is Daniel's step, and no
live hosted call was made. Web AI is therefore *code-ready*, not *live-proven*.

## Register consolidation (post-merge)

After merging `origin/main` into this branch, C12, GT-01 and E1-T1 were advanced to
`VERIFIED-LOCAL` on the 7/7 handler suite plus the tracked `.env.example` allowlist entry;
PILOT rose 17.7 → 20.0 %. Test inventory corrected to 96 files / 538 tests. Full gate green:
typecheck 0, lint 0 errors, 96/538 tests, boundaries 0, AI boundary PASS, readiness check 0,
build 0, QA all systems verified, login 732,759/733,000 B PASS. Evidence:
`docs/evidence/E1-register-consolidation.md`. `VERIFIED-IN-CI` withheld until the pushed head
is green.
