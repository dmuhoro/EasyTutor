# Sprint 34 — Secret-boundary commands and full verification with a connected device

## Context

Daniel asked two questions on 2026-11-24:

1. Give commands to add the Groq API key via CLI (Supabase and Vercel) so that everything that
   should be secret stays concealed server-side.
2. Run all verification steps with the newly attached Android device, to establish honestly
   where the product is and how large the gap to final state is.

No product behaviour changed in this sprint. The deliverables are a verified secret-boundary
statement, copy-safe commands, a complete gate run, a device attempt and an evidence/gap record.

## Spec / boundary

- Constitution Article I (fail closed, no false protection) and Article III / ADR-006 (governed
  boundary) apply. Before giving any command, the real call site was read:
  - `supabase/functions/ai-proxy/index.ts:41` reads `Deno.env.get("GROQ_API_KEY")`, fails closed
    with 503 at `:43`, and attaches it as the upstream bearer at `:95`.
  - `lib/ai/providers.ts:46-60` sends only the Supabase JWT from the client; no client key.
  - The Vercel target is a static export, so `EXPO_PUBLIC_*` is public by construction.
- Therefore the key has exactly one legitimate destination: Supabase Edge Function secrets.
  Vercel must not receive it. This contradicts the "Supabase *and* Vercel" phrasing in the
  request, so it is stated explicitly rather than silently compiling with an unsafe command.

## Work done

1. Verified the boundary by reading code and grepping all shipped source (no value inspected).
2. Produced name-only, no-echo commands for Supabase and an explicit "do not set on Vercel"
   instruction plus a stale-local-name cleanup command.
3. Ran the full declared gate suite on `main` @ `0417c05`; recorded every exit code.
4. Confirmed the attached device and attempted a real native dev build, pinned to JDK 21.
5. Recorded results in `docs/evidence/2026-11-24-verification-and-secret-boundaries.md`.

## Verification outcome (summary)

Green: typecheck, lint, 92/515 tests, boundaries, AI boundary, both secret guards, web export,
entry budget, login-route budget, E2E smoke 9/9, QA runner, full audit.

Not green, and not hidden:

- `npm run perf:lighthouse` **failed closed** (`/` 72, `/login` 67, min 80) under load average
  5.83 with user-owned Chrome processes running. No threshold/budget/timeout/assertion changed.
- `npm run qa:live-preflight` still reports three Daniel-owned prerequisites BLOCKED
  (test user, browser access, Groq secret confirmation by name) and all ten live flows UNPROVEN.
  It now reports `android-device` READY because a device is attached.
- Supabase re-login remains blocked: no user-scoped token available to the agent; three prior
  login paths were recorded in `2026-11-23-vercel-access-and-live-proof.md`. Daniel's two
  key-set attempts were refused by the CLI's agent-mode consent guard and then by an expired
  cached credential (`Invalid access token`); both name-only checks correctly reported MISSING.
- Native build on the attached device did not complete: an empty NDK stub was repaired by
  installing NDK r27b, then Gradle hit transient Maven/TLS handshake failures; a retry stalled
  with no log progress. No APK was produced, so device proof remains UNPROVEN.

## Honest handover

Safe now: secret boundary is correct in code and guards; all deterministic gates are green; the
device is attached and reachable over adb.

Still open: the ten live network/device flows, remote Groq name confirmation, Google OAuth
round-trip, migrations/Auth URL settings, mobile ≥80, and a fair (quiet-host) browser Lighthouse
score. The gap estimate from `docs/COMPLETION_TRACKER.md` is ~21–29 agent-sessions plus one
Daniel-owned input block to a defensible real-world-ready bar. No merge, tag, release or deploy
was performed in this sprint.
