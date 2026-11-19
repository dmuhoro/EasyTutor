# P0 live-truth proof attempt — 2026-11-19

## Scope

Attempted the live browser proof from `scripts/live-proof-checklist.md` against the
deployed EasyTutor web app: sign-in → real Supabase round-trip → fail-closed error.

No credentials, tokens or secret values were printed, stored in the repo, or committed.
No deployment protection was disabled. No timeout, assertion or test was changed.

## Deployed targets observed (via `vercel ls` / `vercel inspect`)

| Target | URL | Alias | Status |
| --- | --- | --- | --- |
| Preview (citation branch) | `https://easytutor-eeezwayrn-dmuhor01.vercel.app` | `easytutor-git-feat-citation-excerpt-on-tap-dmuhor01.vercel.app` | READY |
| Preview (docs branch) | `https://easytutor-bn9br7m15-dmuhor01.vercel.app` | `easytutor-git-docs-followup-decisions-dmuhor01.vercel.app` | READY |
| Production | `https://easytutor-dmuhor01.vercel.app` | `easytutor-ten.vercel.app` / `easytutor-dmuhor01.vercel.app` / `easytutor-git-main-dmuhor01.vercel.app` | READY |

## Verified this session

1. **Static export only** — the deployed artifact is an Expo web export. There is no
   Vercel server runtime or server-side AI route. Provider key belongs in Supabase Edge
   Function secrets, looked up by name at `supabase/functions/ai-proxy/index.ts:41`
   (`Deno.env.get("GROQ_API_KEY")`). Key value was never read.
2. **Vercel Authentication** — plain `curl` to the production URL returns `302` to
   `vercel.com/login`. `vercel curl` returns `200` with `<title>EasyTutor</title>`.
   A plain `curl` with `x-vercel-trusted-oidc-idp-token` also returns `200`, proving the
   header is valid. Browser navigation (Playwright/Chrome, with the header set both in
   context and per-request) is still `302` → `vercel.com/sso-api` → `vercel.com/login`.
   Project has `ssoProtection.deploymentType = all_except_custom_domains`, OIDC enabled
   (`issuerMode: team`), and no Trusted Sources rule. A scoped protection-bypass grant
   for the signed-in Vercel user was requested; a Vercel browser session is still needed,
   so browser navigation remains blocked.
3. **Deployed artifact network config is real** — downloaded 42 assets from the citation
   preview deployment via the OIDC header into `/tmp/opencode/deployed-dist` and served
   them locally. Chrome console: `[SUPABASE INIT] {urlExists: true, keyExists: true}`.
   The bundle contains the real Supabase project host and the `functions/v1/ai-proxy`
   reference. The local `dist/` build was *not* usable for this proof: it baked an
   invalid Supabase URL and rendered an "OFFLINE MODE" banner with no network calls.
4. **Real Supabase round-trip + fail-closed error** — filling the login form and clicking
   the actual submit button produced:
   - `POST https://<project>.supabase.co/auth/v1/token?grant_type=password` → `400`
   - UI: `Sign-in failed` / `Invalid login credentials`
   This proves the real network boundary is reached and that an invalid login is an
   explicit, non-silent error. Screenshots: `/tmp/opencode/live-filled.png`,
   `/tmp/opencode/live-after-signin2.png`.

## Blocked (not verified)

- **Valid test user** — the repo e2e fixture (`test@example.com` / `TestPass123!`) is not
  a remote user (400 above). No test-user email exists in any readable tracked file;
  `supabase/seed.sql` contains zero email addresses. Per repo rule, no `.env*` file was
  read. A valid test login must be supplied in a temp file under `/tmp/opencode` or
  entered directly in a browser session.
- **Browser access to the deployed URL** — Vercel Authentication redirects browser
  navigation. Needs either a Vercel browser session, a Trusted Sources rule, or a
  shareable protection-bypass link (the latter was not created).
- **Authenticated flows** — tutor answer + rail label + citation chip, governed library,
  real quiz/XP, and setup persistence were therefore NOT exercised on the live app.
- **Device E2E** — `adb devices` shows one connected device (`49IZ6DJ7SONNQOBE`) with
  Expo Go installed, but the app is not running there and no valid login is available.

## Cleanup performed

Two stray Vercel deployments accidentally created by `vercel env run` while probing the
browser path (project `live-proof-browser`: `dpl_97aipLgScqPhnLTdWnT9qe3WrGtx`,
`dpl_BLGZZsrux68mQtu8LB9Ls3Sqd5wK`) were removed with approval. Real deployments and
project settings were not modified.
