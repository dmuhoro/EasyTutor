# M1 T3 — boundary proof (network edge mocked only)

New file: `tests/flows/aiProviderBoundary.m1.test.ts` (8 tests). Every test
stubs `fetch` or the auth/config edge; the router, selector, reliability wrapper
and provider clients under test are real.

Covered:

1. `callAIProxy` sends `Authorization: Bearer <Supabase user JWT>` to
   `/functions/v1/ai-proxy`, has no `apikey` header, and its JSON body contains
   no client API key.
2. 429 and 503 each produce exactly two bounded attempts and succeed on the
   recovered response.
3. Exhausted 429 retries return a friendly message with no raw `Error:`,
   `fetch failed` or `TypeError` text.
4. No session + hosted mode returns `success:false`, `provider:'offline'`,
   `selectedProvider:'offline'` with zero `fetch` calls; the study queue then
   holds the request, so it is not silently dropped.
5. Default settings never contact Ollama; on web a loopback URL is refused
   before any `fetch`.
6. Explicit LAN-mode Ollama performs one `/api/tags` probe then one `/api/chat`
   call and reports `local_ollama`.
7. Circuit breaker opens after three failed hosted runs, blocks the next run
   with zero additional `fetch` calls, and closes after a successful probe
   past cooldown.

## Commands run this session

- `npm run typecheck` → 0 errors.
- `npx vitest run tests/flows/aiProviderBoundary.m1.test.ts` → 1 file / 8 tests passed.
- `node scripts/qa/check-ai-boundary.mjs` → `[AI BOUNDARY] PASS`.
