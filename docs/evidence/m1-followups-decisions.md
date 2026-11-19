# Post-release follow-up decisions — 2026-11-19

Recorded after release `v1.14.0`. Daniel's decisions, taken verbatim from his answers this
session. This is a decision record, not a claim that the work is complete.

| Item | Decision | Consequence |
|---|---|---|
| Provider secret | "You set it in Supabase (Recommended)" | Daniel provisions `GROQ_API_KEY` as a Supabase Edge Function secret. I verify only that `supabase/functions/ai-proxy/index.ts` reads it by name (`Deno.env.get("GROQ_API_KEY")`, line 41); I never see, print or store its value. |
| P0 live proof | "Preview URL + test user + device (Recommended)" | Blocked until Daniel supplies the deployed preview URL, a test login and device access. Non-secret handover details still outstanding. |
| P1 mobile performance | "Keep >=80, mark NOT MET" | No target change, no ADR, no budget change. Lighthouse mobile remains ❌ NOT MET (historical measurements 49 `/`, 58 `/login`). Do not raise or lower the target to manufacture green. |
| P2 Phase 2 UI | "Wire them in" | Replace the live screens with the Phase 2 versions — not archive. Scope and sequencing to be established from the code before editing (STATUS.md currently records these screens as NOT ACCEPTED dead code). |
| P2 citation UX | "Add excerpt-on-tap" | Tapping a source chip must reveal the retrieved excerpt. |

## Credential surface (verified this session, values never read)

`vercel env ls` for `dmuhor01/easytutor`: `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` already exist in **Preview** and **Production** as type
**Config**. The web app is a static Expo export (`npx expo export --platform web`, output
`dist`) with **no Vercel server runtime**, so there is nowhere on Vercel to hold a provider
key server-side. Putting `GROQ_API_KEY` in a `EXPO_PUBLIC_*` variable would ship it in the client
bundle. It belongs in Supabase Edge Function secrets, consistent with
`supabase/functions/ai-proxy/index.ts:25-47`.

`.env.local` exists (5 lines) and was never read — only its existence and line count were
checked with `test -f` / `wc -l`, per the repo's env-safety rule.

## Not claimed

No live provider call, deployed-proxy proof, cloud data round-trip or real-device E2E was run.
`GROQ_API_KEY` was not set by me. No deploy was performed.
