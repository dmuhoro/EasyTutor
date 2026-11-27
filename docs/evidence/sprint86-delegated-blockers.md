# Sprint 86 — delegated owner tasks: observed blockers (2026-11-27)

**Authority:** owner message delegating the `Daniel-only` rows, plus follow-up
answers (create both staging projects; use proposed defaults; derive what can be
derived and leave the rest open). `D11` is explicitly deferred by the owner.
**Actor:** agent under that delegation.
**Purpose:** record exactly what was attempted and observed. This file is **not**
at any `daniel-DNN.md` acceptance path, so no readiness gate is satisfied by it.
Every row below remains at its register status, which is unchanged.

## Observed facts

| Row | Attempt | Observed result | Gate |
| --- | --- | --- | --- |
| D03 | `supabase projects create easytutor-staging --org-id <org> --region ap-southeast-2 --size micro --yes` | `{"_tag":"Error","error":{"code":"ProjectsCreateUnexpectedStatusError","message":"Unexpected error creating project: {\"message\":\"Forbidden\"}"}}` | RED |
| D03 | `supabase branches create staging --persistent --size micro --region ap-southeast-2 --yes` | HTTP 402, `entitlement_required`, feature `branching_limit`; message: branching is supported only on the Pro plan or above. Upgrade URL returned by the CLI, not reproduced here. | RED |
| D04 | `vercel list_projects` via authenticated MCP connection | HTTP 403 `forbidden`, scope `dmuhor01`, team `team_sGSR187e4tniaRMCYJ8yb0JG`. Recovery tool returned a single-use team-consent link (10-minute expiry) requiring owner approval. No staging project was created. | RED |
| D01 | Searched the connected tool catalog for a Stitch key rotation operation | No key rotation/revocation tool is exposed. Only project, screen and design-system operations are available. Rotation requires an authenticated dashboard action. | RED |
| D05 | Checked for a usable live-call path | `supabase secrets list` exposes secret **names** only (values are fingerprints); CLI has no `secrets get` subcommand. No staging project or staging test user exists. No live hosted call was made. | RED |
| D07 | Checked for a Groq limit read | No Groq credential is readable through an approved interface here; no tier, RPM/TPM or token/day value was observed. No assumed number was recorded as fact. | RED |
| D08 | `supabase projects list --output-format json` | Returned project id, name, region `ap-southeast-2` and status `ACTIVE_HEALTHY`; **no plan or egress-limit field** was returned. Billing plan remains UNVERIFIED. | RED |
| D09 | Same Vercel scope failure as D04 | Plan and egress limits are UNVERIFIED until team access is approved. | RED |
| D10 | Read-only `supabase config diff --output-format json`, plus inspection of `supabase/config.toml` | Remote `auth.site_url` is already `https://easytutor-ten.vercel.app` (observed at `changes[12].remote`). Remote `auth.additional_redirect_urls` is `["http://localhost:8081"]` — **not** the production host — so the redirect allow-list is a real defect. Google provider is enabled remotely with a client id; the OAuth callback itself is not observable from this machine. Local config holds stale localhost values. I did **not** run `supabase config push`: the diff reports 14 `update`, 3 `remote_only` and 2 `local_only` changes, so a blanket push would overwrite unrelated production settings. A targeted auth-config write was not available through an approved interface. | RED |
| D13 | Delegated priority decision recorded in `DEC-02` | No pack content was reviewed line by line; no `source_status` was flipped to OFFICIAL. Partial note moved to `docs/evidence/blocked/daniel-D13.md`. | RED |
| D14 | Marking source confirmed for Mathematics only | No scheme confirmed for Kenya TVET Automotive Science Principles or a university pack. Partial note moved to `docs/evidence/blocked/daniel-D14.md`. | RED |
| D15 | Owner selected a GitHub issue as the alert destination under the delegation granted in this session | Destination created: issue #69, `https://github.com/dmuhoro/EasyTutor/issues/69`. No secret, credential or learner data was written to it. Billing dashboard access was **not** supplied and Groq limits remain UNVERIFIED (D07), so alert thresholds are deliberately unset. | RED |
| D16 | Pilot-size and AI-envelope portions recorded | Provider plan, committed spend and capacity-runbook sign-off withheld because D07/D15 are UNVERIFIED. Partial note moved to `docs/evidence/blocked/daniel-D16.md`. | RED |
| D11 | Explicitly deferred by the owner | No file created and no action taken. | RED |

## Rows actually executed under delegation

`DEC-01`, `DEC-02`, `DEC-03`, `DEC-04`, `DEC-05` record the accepted proposed
defaults as **delegated ratifications**, with actor and authority named in each
file. `docs/evidence/daniel-D12.md` records the approved mobile-target policy,
not a measured Lighthouse pass. None of these change the register status.

## Promotion rule

No row is promoted by this file. Promotion still requires the exact acceptance
command, a pushed green CI run on the exact SHA, and a separate docs PR as
specified in `sprints/sprint_86_pilot_ready.md`.
