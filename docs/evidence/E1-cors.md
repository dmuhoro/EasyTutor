# E1 — CORS on the hosted AI proxy (GT-01)

Branch `fix/ai-proxy-cors` from `origin/main` @ `859b9dc`. No live call is claimed.

## Premise re-verified before coding (Constitution Article I)

- `supabase/functions/ai-proxy/index.ts` (pre-change, line 34): `if (req.method !== "POST") return json({ error: "method" }, 405);`.
- The old `json()` helper set only `content-type`. No `OPTIONS` branch and no
  `Access-Control-*` header existed anywhere in the function.
- `lib/ai/providers.ts:55` calls the proxy with plain `fetch`, sending `Content-Type` and
  `Authorization` (not `functions.invoke`). `lib/groqConfig.ts:31` does the same.
  Preflight must therefore allow at least `content-type, authorization`; the implementation
  also allows `x-client-info, apikey` for supabase-js callers.

## Change

- Extracted the request logic into `supabase/functions/ai-proxy/handler.ts` (Web-standard
  Request/Response/fetch only, following the existing `health.ts` precedent).
  `index.ts` is now a thin Deno adapter injecting `Deno.env`; **all** responses go through
  one CORS-aware boundary (`json`, `preflightResponse`, `withCors`).
- `cors.ts`: `ALLOWED_ORIGINS` is comma-separated, exact http(s) origin match, trimmed and
  de-duplicated. `*`, malformed values, and empty input fail closed (no reflected origin).
- `OPTIONS` → **204** with `Vary: Origin`, `Access-Control-Allow-Origin` only for an
  allowlisted origin, `Access-Control-Allow-Headers: authorization, x-client-info, apikey,
  content-type`, and `Access-Control-Allow-Methods: POST, OPTIONS`. Preflight never reaches
  auth or the provider.
- Auth, daily cap (200), body cap (16 KB), token cap (1000), provider/model allowlists,
  error shapes and the append-only log are unchanged.
- `tsconfig.json` gained `allowImportingTsExtensions` and `noEmit` so a test can import the
  shared Deno handler (which must keep `.ts` import specifiers). No gate, threshold or
  assertion changed; `tsc --noEmit` still passes with 0 errors. Verified that Deno 2.9.7
  cannot resolve extensionless local imports, so this is the compatible option.

## Proof

Red first (before any implementation):

```
npx vitest run -c vitest.config.js tests/flows/aiProxy.cors.test.ts
RED_EXIT=1
Error: Cannot find module '../../supabase/functions/ai-proxy/handler'
```

Green after:

| Command | Result |
|---|---|
| `npx vitest run -c vitest.config.js tests/flows/aiProxy.cors.test.ts` | **7/7 pass** |
| `npx vitest run ... tests/flows/aiProxy.health.test.ts tests/flows/aiProxy.boundary.test.ts` | 6/6 pass |
| `npm run check:ai-boundary` | PASS |

Covered: allowed-origin preflight; preflight performs zero upstream calls; disallowed origin;
wildcard rejected; missing/empty env; GET keeps 405 with the original body; POST success;
401; 502; 429; POST from a disallowed origin; `Vary: Origin` on every path.

## Daniel-only (not done by agent)

Set the `ALLOWED_ORIGINS` Edge Function secret in the deployed Supabase project to the exact
production origins. Until then a deployed browser caller receives no `Access-Control-Allow-Origin`.
`ALLOWED_ORIGINS` is named (no value) in `.env.example`. A live hosted call remains UNPROVEN.
