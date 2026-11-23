# 2026-11-23 — Vercel browser access, production Lighthouse attempt, live-proof blockers

## Scope and authorization

Daniel authorized: merge of PR #17 after #16, the 1.16.0 release and tag, Vercel browser access
(Trusted Sources `development` → `production` **or** an approved bypass), a remote test user,
device proof, staging/production migrations and Auth URL settings, and Supabase CLI re-login for
a name-only `GROQ_API_KEY` check. Only the merge, release/tag and Vercel HTTP/browser access
were achievable in this session. Everything else is explicitly **BLOCKED**, not silently
closed.

## Vercel CLI access — ACHIEVED, then restored

1. `vercel whoami`, `vercel project inspect` and `vercel ls` confirmed the linked project
   (`dmuhor01/easytutor`, `prj_icxy4Dnghq3y6jO7wjiaaZYdt2UL`).
2. The `VERCEL_OIDC_TOKEN` in `.env.local` was **expired** by ~71 days. That, not a missing rule,
   explained the earlier 302s. A fresh token was obtained with
   `vercel env pull /tmp/opencode/vercel-env-pull.env --yes` (mode 600; only the token's expiry
   metadata was inspected, never its value).
3. With the fresh token, the latest preview returned HTTP 200 and the latest production
   (`https://easytutor-ldi7s2shv-dmuhor01.vercel.app`) returned HTTP 403 with
   `TRUSTED_SOURCES_ENVIRONMENT_MISMATCH`.
4. Using `vercel api` (CLI, not MCP — MCP is 403 for this project), one narrow self-access
   Trusted Sources rule set was added: production→production, preview→preview,
   development→preview (the three defaults) **plus development→production**. No other project,
   provider or environment pair was added; Deployment Protection was not disabled.
5. After the rule, production `/` and `/login` both returned HTTP 200 with the OIDC header.
   Browser-authenticated Lighthouse was then run against production.
6. **After measurement the rule was reverted** with `trustedSources: null`. Read-back confirmed
   `trustedSources: null`; production is 403 again and preview is 200 (default behaviour). No
   persistent access-control change remains from this session.

## Production browser Lighthouse — BELOW TARGET, NOT CLAIMED AS PASS

Desktop preset, `performance` only, `extra-headers` supplied from a mode-600 file containing the
short-lived OIDC header. Scores were read from the raw JSON reports; no threshold or budget was
changed.

| Run | `/` | `/login` | TBT | Host load average |
| --- | --- | --- | --- | --- |
| 1 | 65/100 | 74/100 | 760 ms / 520 ms | 3.58 / 4.01 / 3.58 |
| 2 | 71/100 | 66/100 | 600 ms / 710 ms | 6.20 / 4.63 / 3.82 |

Both runs are **below 80**. FCP and LCP were fast (0.2–0.6 s); the failure is dominated by TBT
under heavy host contention (a user-owned Chrome renderer was at ~100% CPU and was deliberately
not terminated).

This does **not** replace or invalidate the five Sprint 33 local-export runs on the byte-identical
bundle (`/` 89–92, `/login` 90–92, TBT 180–220 ms) in
`docs/evidence/2026-11-23-lighthouse-80.md`, and it does **not** establish a passing Vercel browser
score. The honest statement is: **local export MET under normal load; Vercel browser production
NOT MET under the load present in this session.** No number was rounded up, no route was dropped,
and neither gate was weakened.

## Remaining blockers — owner Daniel

- **Supabase CLI re-login:** no `SUPABASE_ACCESS_TOKEN` in the shell or Vercel project env; `~/.supabase`
  holds no auth file. Three agent attempts were made: plain `supabase login` (rejected as non-TTY),
  pseudo-terminal `supabase login` (rejected as JSON/non-interactive output mode), and
  pseudo-terminal `supabase --agent no --output pretty login` with Enter fed in (reached
  “Press Enter to open browser and login automatically” then timed out twice, 300 s and 240 s,
  with no browser approval and no auth file created). No one-time code or URL was printed.
  `supabase secrets list --remote=iypolnvuwgdxzxviyxqr --output-format json` still exits 1.
  Daniel must supply a user-scoped token via `supabase login --token` in his own terminal or
  approve the browser flow himself. Without it, the remote `GROQ_API_KEY` name cannot be confirmed.
  The code lookup itself is at `supabase/functions/ai-proxy/index.ts:41`
  (`Deno.env.get("GROQ_API_KEY")`); the client-side `EXPO_PUBLIC_GROQ_API_KEY` is not sufficient proof.
- **Remote test user:** no mode-600 credential file was supplied, so `qa:live-preflight` cannot
  report `READY test-user`. The repository fixture is invalid and was not retried.
- **Google OAuth round-trip:** Daniel reports Google as enabled in Supabase Auth, but no live
  browser round-trip was performed; UNPROVEN.
- **Physical device:** `adb devices` listed no attached device; device E2E UNPROVEN.
- **Staging/production migrations and Supabase Auth redirect URLs:** require authenticated
  Supabase CLI/dashboard access; not applied or verified in this session.
- **Mobile Lighthouse ≥ 80:** remains NOT MET (`/` 45, `/login` 46). No target was relabelled.

No screenshot, credential file, secret value, one-time code or environment-specific path was
committed or pasted into chat.
