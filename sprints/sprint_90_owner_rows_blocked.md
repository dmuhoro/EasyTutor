# Sprint 90 — Owner-row probe: D10, D03/D08, device, tag

**Date:** 2026-11-28 · **Base:** `main` `45cd3ae` · **Type:** read-only investigation
and documentation. **No product code, no gate promotion, no release.**

## Trigger

The owner granted authority to execute `D10`, `D03`/`D08`, device sign-in (only
after a signed APK), to leave `D11` deferred, and to tag only on an exact reply.
This sprint records what could and could not be executed.

## What was observed

- `D10`: remote `auth.site_url` is correct, but `auth.additional_redirect_urls`
  contains only `http://localhost:8081`; production Vercel aliases are known.
  Google is enabled remotely. No targeted auth-config write exists in the CLI,
  and a blanket `config push` would overwrite 19 unrelated settings. Google
  Cloud Console access is unavailable. No write attempted.
- `D03`: only the production Supabase project exists; staging project creation
  was previously `Forbidden` and preview branching `402 entitlement_required`.
- `D08`: `organizations_read` still returns 403; no plan/egress field is exposed
  by the project list. Vercel's plan does not answer the Supabase question.
- Device: no signed APK after the 12-hour build termination; delegation was
  conditional, so no device command was run.
- `D11`: deferred; no action. Tag: no exact instruction and critical rows open.
- CI note: the D07 docs PR needed one failing-job rerun after a serious
  colour-contrast violation in the profile-error banner. No test was weakened;
  Sprint 91 later fixed the underlying defect with a red/green control.

## Decision

No `daniel-D10.md`, `daniel-D03.md` or `daniel-D08.md` was created. Creating one
would claim a protection/write that did not happen. No readiness row was
promoted by this sprint, no cap, threshold, matcher or test was changed, and no
tag was created.

Full observation record: `docs/evidence/sprint90-owner-rows-d10-d03-d08.md`.
