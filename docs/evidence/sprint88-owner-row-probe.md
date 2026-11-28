# Sprint 88 — owner-row execution probe and Stitch/Groq wiring findings

**Date:** 2026-11-28 · **Branch:** `main` @ `872be0a` · **Authority:** owner asked to
execute every `Daniel-only` row that can be executed, and asked three questions:
whether everything from Stitch was wired, whether a Groq MCP server can be used to
verify the AI call, and what comes next.

No product code changed. No readiness row was promoted. No `daniel-D*.md` gate file
was created, because none of the owner-side facts required by those gates were
available. No secret value, credential, token, learner data or billing field appears
in this record; only variable names and presence/absence are stated.

## 1. Execution attempts, fail closed

| Row | Attempt | Observed fact | Outcome |
|---|---|---|---|
| `D01` Stitch rotation | Reused the configured Stitch MCP server for a read-only `list_screens` call against project `8672350964718206202`. | MCP returned `401 API key not valid`. The shell exposes `STITCH_API_KEY` by name only; its value was not read, logged or pasted. | **BLOCKED.** The previously exposed key is invalid/revoked or wrong. Rotation/revocation must happen in Stitch settings; the agent cannot perform it. |
| `D07` Groq facts | Read the public Groq Rate Limits and MCP docs; checked configured provider env by name. Later, the owner pasted the exact limits-page values for `openai/gpt-oss-120b`. | Groq documents RPM/RPD/TPM/TPD as organisation-level and says exact values live at the account limits page. Owner-supplied values: 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD; no tier label was present. `GROQ_API_KEY` is absent from the agent shell. | **RESOLVED for account limits** in `docs/evidence/daniel-D07.md`. Tier name remains unclaimed; model is not on the app allowlist, so these limits do not describe the live rail. |
| `D03` / `D08` Supabase org scope and plan | `supabase projects list --output json`; `supabase orgs list --output json`; `supabase projects get …`. | CLI is authenticated and sees one linked project, but `orgs list` returned `403 … missing_permissions: ["organizations_read"]`; the project-detail call also failed. | **BLOCKED.** No owner scopes, no plan confirmation, and no evidence that the linked project is the intended staging target. No `daniel-D03.md` / `daniel-D08.md` created. |
| `D10` Auth URLs / OAuth callback | Checked env names and CLI reachability. | `SUPABASE_ACCESS_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY` are absent from the agent shell; the exact staging/production redirect origins were not supplied by the owner. | **BLOCKED.** Guessing production Auth or OAuth callbacks would be an unsafe write. No `daniel-D10.md` created. |
| Device sign-in | Checked `/tmp/opencode/work/apk/build-lowmem.status` and output directory. | `EXIT=TERMINATED_AFTER_12H_NO_APK`; no APK exists. | **BLOCKED.** The connected device cannot be used until a signed APK is built. |
| `D11` | Deliberately skipped. | Owner previously deferred it. | **NO ACTION.** |
| Final tag | Checked remote refs. | No `v1.17.0` tag exists. | **BLOCKED** on the owner's exact `TAG v1.17.0` instruction and the remaining critical-path proofs. |

`SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` and the Stitch
key were handled as names only. Presence was tested with a parameter-expansion check
that emits only `present` / `absent`; no `.env*` file was printed.

## 2. Stitch: was everything wired into the product?

**No.** Stitch output was treated as a visual specification, not as runtime source.
The tracked design set at `docs/design/stitch/manifest.json` contains **35 screens**;
the untracked local export under `ASSETS/stitch_easytutor_ai_study_companion/`
contains **36 folders**, including a TVET learning-platform variant and two
`DESIGN.md` theme documents. Nothing under `ASSETS/` is imported by `app/` or
`screens/`, and the directory is untracked user work — it was not modified.

What is genuinely wired (Sprint 21 evidence):
- Design tokens and the palette come from the Stitch export
  (`src/design/tokens.ts`, `docs/design/stitch/design-tokens.json`).
- The core tab journeys rebuilt from the references: Today/Home, Learn/Study,
  Practice/Quiz, Library/Roadmap, Onboarding/Setup, Login and You/Profile/Progress.
- Route inventory is now **42 route files**, all mounted and smoke-tested.

What is **not** fully wired:
- **Tutor session:** a real deep-link route exists at `app/tutor/session.tsx:4`, but
  Home's `Ask tutor` action goes to `/(tabs)/study` (`screens/tabs/index.tsx:261`).
  The Stitch tutor-session, friction and citation-modal variants are therefore not
  the primary wired tutor experience. The older coverage map in
  `docs/design/stitch/README.md` saying "no route" is stale; the accurate statement
  is "route exists, not linked from the main tab action".
- **Desktop designs:** no desktop layout exists in `app/`; only mobile tab routes.
- **Localisation variants:** Swahili/French packs exist, but the per-screen Stitch
  locale variants are not delivered as separate screens.
- **Dark variants:** chrome follows the selected theme, but screens remain
  light-first (`app/(tabs)/_layout.tsx:18-20`).
- **States:** connection error, offline banner, not-in-notes, tutor-limit and empty
  states are scattered across components rather than wired as the designed screens.
- **Onboarding step 5:** the exam-date concept is merged into the wizard's
  `4 · Goal & exam date` step (`screens/setup-wizard/index.tsx:75`), not delivered
  as the separate Stitch step.
- **New untracked TVET variant and theme documents:** not committed, not imported,
  not wired.
- **Never produced in Stitch/product:** a sign-up screen, an "Add to weak spots"
  confirmation state, and desktop Library/You.

Conclusion: the Stitch work was a faithful token/spec translation of the main
learner loop, not a complete screen-by-screen port. No claim is made that all Stitch
screens are live.

## 3. Can a Groq MCP server be used to verify the AI call?

**Possible, but it verifies a different boundary unless it is built specifically to
call EasyTutor's proxy.**

Groq's documented MCP feature is *remote tools inside a Groq inference request*:
Groq calls an external MCP server's `tools/list` / `tools/call`, then the model uses
those tools. It is not, by itself, an MCP endpoint that OpenCode can connect to in
order to test EasyTutor. Setting up a generic Groq MCP wrapper would call
`https://api.groq.com/...` with `GROQ_API_KEY`, bypassing the app's Supabase JWT
check, daily cap, origin allowlist, audit log and model allowlist at
`supabase/functions/ai-proxy/handler.ts:19-24,59-74,112-132`. That is a provider
smoke test, not the real app path.

The real app path is:
`app → lib/ai/reliability.ts → providers.callAIProxy → Supabase function ai-proxy → Groq`.
`D05` remains open because no signed-in, hosted call through that path has been
recorded.

A useful MCP design would be a small **EasyTutor MCP server** with two tools:
- `ai_proxy_health` — calls `/functions/v1/ai-proxy/health` and reports ok/model/error;
- `ai_proxy_call` — calls the deployed proxy with a staging test JWT supplied only
  through an environment variable (name, never value, in config/docs).

That tool would exercise the same boundary the learner uses. It can be built after
`D02`/`D03`/`D05`/`D10` supply the deployed function, exact origins, a test user and
the Groq secret in Supabase. Any JWT/API key stays server-side; no secret is placed
in the repo, a fixture, a chat message or an MCP URL.

Model caveat: the playground used `openai/gpt-oss-120b` with
`max_completion_tokens=2048`, `reasoning_effort="medium"` and streaming. The app
allowlist is only `llama-3.1-8b-instant` and `llama-3.3-70b-versatile`
(`src/config/registry.ts:57-62` and the mirrored proxy constant), the proxy caps
`max_tokens` at 1000 and does not stream. Adopting the playground model/request
shape would be a separate spec, dual allowlist change, red/green proof and capacity
recalculation — not something to infer from a successful playground answer.

## 4. What is next

1. Owner-side critical path: `D01` rotation, `D10` URLs/callback, `D03`/`D08`
   scopes and plan. `D07` account limits are now recorded, but the tier label and
   the limits for the app's allowed models remain unclaimed.
2. Agent-owned after (or independent of) those facts: `GT-24` median-of-3 mobile
   Lighthouse baseline and a fail-closed gate at the delegated floor of 60, then the
   ratchet to 80; `E16-T1` per-feature token budget using real tier facts.
3. Optional enabler: build the EasyTutor MCP wrapper described above once the real
   staging proxy and test JWT exist, then record `D05` from its first live call.
4. Device proof remains blocked until a signed APK exists; the 12-hour low-memory
   build attempt produced no APK.
5. `v1.17.0` only after the owner's exact `TAG v1.17.0` reply and the remaining
   critical proofs.

No readiness row was promoted by this investigation and no test, threshold, budget,
matcher or timeout was changed.
