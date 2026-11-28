# Sprint 88 — Owner-row probe, Stitch wiring truth, Groq MCP feasibility

**Date:** 2026-11-28 · **Base:** `main` `872be0a18cff49b003489106b1879b366100fcf7`
(tag `v1.16.7` is the last verified release; no `v1.17.0` tag). **Type:** investigation
and documentation only. **No product code, no readiness promotion, no release.**

## Trigger

The owner asked four things after the Physics playground output:
1. was everything received from Stitch wired into the product;
2. execute every `Daniel-only` row that can actually be executed;
3. whether a Groq MCP server can be reached to verify that the AI call works;
4. what the team works on next.

## Boundary and method

- Enforce only at real boundaries: Supabase `ai-proxy` at
  `supabase/functions/ai-proxy/handler.ts:19-24,59-74,112-132`; route inventory and
  boot boundary were not modified.
- Fail closed: no `daniel-D*.md` gate file is created without the fact that file is
  meant to prove. No guessed Auth callback, no inferred account tier, no silent
  promotion.
- No secret value, credential, token, learner data or billing field is read, logged
  or written. Presence checks emit only `present` / `absent`; MCP errors are recorded
  without the key.

## What was done

- Re-ran the route smoke inventory: **42 route files, 44 tests pass**.
- Compared `docs/design/stitch/manifest.json` (35 screens) with the untracked local
  export under `ASSETS/stitch_easytutor_ai_study_companion/` (36 folders) and with
  live `app/` and `screens/` routes.
- Attempted owner rows using only read-only checks: Stitch MCP `list_screens`
  (401), Supabase CLI project/org calls (one linked project, `organizations_read`
  403), env-name presence, APK status, remote tag lookup.
- Read Groq's current public MCP and Rate Limits documentation and compared the
  playground request shape with the app's proxy request shape and allowlists.

## Decisions and outcome

- **Stitch:** not fully wired. Core learner loop and tokens are wired; tutor session
  is a deep-link route but not the tab's Ask-tutor destination; desktop, dark
  per-screen variants, locale variants, several states, the untracked TVET variant
  and theme documents are not wired. The older "no route" note in
  `docs/design/stitch/README.md` is stale and is corrected in the evidence: the
  accurate state is "route exists, not linked from the main tab action".
- **Owner rows:** all externally gated rows stayed blocked; none was faked. Device
  proof is blocked because the low-memory Android build terminated after 12 hours
  with no APK. `D11` remains deferred by the owner.
- **Groq MCP:** possible as a remote-tool feature of Groq inference, but it does not
  by itself prove EasyTutor's app path. A custom EasyTutor MCP wrapper could call
  the deployed `ai-proxy` with a staging JWT from env and would exercise the real
  boundary; build it only after the staging/live facts exist. The playground's
  `openai/gpt-oss-120b`, streaming and 2048-token request shape differs from the
  app's allowlisted models, 1000-token cap and non-streaming proxy call.
- **Next:** owner critical path first; then agent-owned `GT-24` mobile baseline/gate
  and `E16-T1` capacity proof; optional MCP wrapper as a D5 enabler; tag only on the
  owner's exact instruction.

Full command-level record: `docs/evidence/sprint88-owner-row-probe.md`.

## Not claimed

- PILOT READY, `openP0=0`, `criticalNotCI=0`, or any readiness-row promotion.
- Live hosted AI call, staging smoke, device install/sign-in, PWA installability,
  production Lighthouse pass, or a signed APK.
- That the Groq playground answer proves account tier, limits, or the app proxy path.
- That every Stitch screen is live.
- `v1.17.0`; no tag was created.
