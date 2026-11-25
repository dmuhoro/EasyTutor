# D02 — ai-proxy deployed with real ALLOWED_ORIGINS

**Executed:** 2026-11-25 by the agent in Daniel's terminal session, with explicit
consent for the two hosted writes (`SUPABASE_YES=1`). No secret value is recorded
here; every check below used name/status/lookup only.

## Token scope

The replacement Supabase access token can read projects, functions and secrets:

- `supabase projects list --output json` — project list returned (no permission error).
- `supabase secrets list --remote=iypolnvuwgdxzxviyxqr --output json` — names returned.
- `supabase functions list --remote=iypolnvuwgdxzxviyxqr --output json` — names/status returned.
- `supabase link --project-ref iypolnvuwgdxzxviyxqr` — linked.

## Hosted writes (both exit 0)

1. `supabase secrets set ALLOWED_ORIGINS=<two exact Vercel origins>
   --remote=iypolnvuwgdxzxviyxqr`
2. `supabase functions deploy ai-proxy --use-api
   --remote=iypolnvuwgdxzxviyxqr`

The previous token had produced no error for `secrets set` but **did not write**
the secret; that false success is why this row stayed red. The new token's
read-back proved `ALLOWED_ORIGINS` was absent before the write.

## Remote state after

- Secret names: `ALLOWED_ORIGINS`, `GROQ_API_KEY`, plus the runtime-injected
  `SUPABASE_*` names. Values were never read or copied.
- Function: `ai-proxy` **ACTIVE v6** (was ACTIVE v4, which predated the
  fail-closed CORS fix in commit `7de8695`).

## Live proxy proof (no credentials sent)

`OPTIONS /functions/v1/ai-proxy` with `Access-Control-Request-Method: POST`:

| Origin | HTTP | `access-control-allow-origin` |
|---|---|---|
| `https://easytutor-ten.vercel.app` | 204 | exact origin reflected |
| `https://easytutor-esywf57uu-dmuhor01.vercel.app` | 204 | exact origin reflected |
| `https://evil.example` | 204 | **header absent** (fail closed) |

`Vary: Origin` is present in every response. No wildcard was emitted.

## Not proven here

- **D05 / live AI rail:** `GET /ai-proxy/health` returns 401 when called with no
  header or with the publishable anon key; the deployed function verifies a real
  user JWT. A signed-in learner session is required, so no live Groq call was
  made and no claim about key validity is made.
- D03/D04 staging, D01 key rotation and the remaining Daniel decisions remain open.

## Status rationale

Promoted to `VERIFIED-LOCAL`, not `VERIFIED-IN-CI`: the proof is a real hosted
lookup performed from a terminal, and CI cannot observe this project's remote
state. No CI-only status is claimed on the strength of a local command.
