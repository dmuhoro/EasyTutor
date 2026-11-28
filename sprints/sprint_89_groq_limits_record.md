# Sprint 89 — Record D07 Groq account limits

**Date:** 2026-11-28 · **Base:** `main` `fbbe0d2` · **Type:** owner-fact evidence only.
**No product code, no release, no cap or budget change.**

## Trigger

The owner supplied values read from the Groq limits page for
`openai/gpt-oss-120b`: 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD, each marked as
an org limit. This closes the factual gap that kept `D07` red in Sprint 88.

## What was recorded

- `docs/evidence/daniel-D07.md` — exact owner-supplied facts, no secret or billing
  field, no inferred tier label.
- Fail-closed capacity arithmetic against the live proxy caps:
  200 calls/day organisation-wide at 1,000 output tokens/call, 8 calls/minute at
  8,000 TPM; 10 learners implies at most 20 calls/learner/day.
- Explicit warning that `openai/gpt-oss-120b` is not on the app allowlist, so the
  recorded limits do not describe the current live rail.
- `docs/evidence/sprint88-owner-row-probe.md` updated from BLOCKED to RESOLVED for
  the limits portion of `D07`.

## Not claimed

- No tier/plan name; the pasted excerpt did not contain one.
- No limits for `llama-3.1-8b-instant` or `llama-3.3-70b-versatile`.
- No live hosted AI call (`D05` remains open).
- No capacity model run; `scripts/ops/capacity_model.mjs` is still absent.
- `D07` is promoted only to `VERIFIED-LOCAL`, not `VERIFIED-IN-CI`, because a
  dashboard-read fact cannot be observed by CI. No tag.
