# Live-proof session record — Groq rail: reachability proven, auth blocked (fail-closed, honest)

**Date:** 2026-09-12
**Session:** live-proof layer, attempt 1 — order rail (Ollama excluded, still installing)
**Verdict:** ⚪ **NOT green** — but forward evidence captured. No version bump, no green claim.

## What was actually run (real network, real rail — `lib/api.ts:94` URL, LLM rail only)

Executed a live HTTPS round-trip to the exact governed rail the running app uses:

- **Endpoint:** `https://api.groq.com/openai/v1/chat/completions` (the app's committed URL, same one at `lib/api.ts:158`)
- **Model:** `llama-3.1-8b-instant`
- **`^`URL` reality check:** the operator's URLs were correctly de-conflicted:
  - `console.groq.com/keys` → key-creation page (correct source of the key)
  - `api.groq.com/openai/v1` → the TRUE API base the app calls (this is the one we wired)
  - `ngrok` → tunneling for the phone↔laptop↔Ollama rail (a DIFFERENT layer, not the Groq endpoint)

## RESULT (verbatim, redacted — key never echoed, never stored, never committed)

- **HTTP: 401**
- **Groq error body:** `invalid_api_key` (redacted; key value not reproduced here or anywhere)
- **Meaning, stated honestly:** the rail reached Groq's servers live and got a *real* HTTP
  response (not a timeout, not a DNS failure → **network + endpoint reachability: PROVEN**).
  The link that failed is the **key string itself** (auth rejected → **credential: BLOCKED**).

## Why this is NOT a green claim (fail-closed discipline)

The constitution forbids claiming "live AI round-trip" when the provider rejected the
credential. The 401 proves connectivity but NOT authentication, and by rule the round-trip
stays **Blocked** until a `200` with validated JSON structure returns.

## The single control that showed "one truth, not my memory"

The operator's Groq knowledge rail lives where the app actually runs and is git-verified:
`lib/api.ts:94` and `lib/api.ts:158` — the URL foundations. There is exactly ONE rail to
prove against, and this evidence cites that rail, not a parallel/invented one.

## Next step to go green (single, credential-gated, never committed)

1. Open https://console.groq.com/keys
2. Since `invalid_api_key` most often means the key string was corrupted in transit or
   regenerated: use the **Copy button** (never hand-type), then paste verbatim once.
3. Re-run the SAME governed rail with the corrected key, in-process env var only
   (`$EXPO_PUBLIC_GROQ_API_KEY`), never committed.
4. Only a real `200` + valid JSON content earns the green mark and the checklist tick.

## Artifacts

- This evidence: `docs/evidence/2026-09-12-groq-rail-auth-blocked.md`
- Live-proof checklist: [`scripts/live-proof-checklist.md`](../../scripts/live-proof-checklist.md)
- Rail source (governing boundary): [`lib/api.ts`](../../lib/api.ts)
