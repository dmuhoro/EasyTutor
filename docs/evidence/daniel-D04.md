# D04 — staging Vercel project and protection

**Executed:** 2026-11-27 by the agent under the owner's explicit delegation for
Daniel-only rows (`D11` excluded). No secret value, credential or learner data is
recorded here.

## Scope

This row provisions the Vercel side only. It does **not** create a Supabase
staging backend, environment variables, a domain, or a deployment.

## Commands and observed results

- `vercel whoami --format json` (selected fields only): effective team
  `dmuhor01`.
- `vercel project add easytutor-staging --scope dmuhor01 --non-interactive`
  — exit 0; CLI reported `Success! Project easytutor-staging added (dmuhor01)`.
- `vercel project protection enable easytutor-staging --sso --scope dmuhor01 --non-interactive`
  — exit 0.
- Read-back with `vercel project protection easytutor-staging --json --scope dmuhor01 --non-interactive`:

```json
{
  "projectId": "prj_QHSU7fWkMfIijBktDB7ZcU87jrlA",
  "name": "easytutor-staging",
  "ssoProtection": { "deploymentType": "prod_deployment_urls_and_all_previews" },
  "gitForkProtection": true
}
```

## What is proven

- Project `easytutor-staging` exists in team `dmuhor01`.
- Vercel Authentication is enabled for production deployment URLs and all
  previews.
- Git-fork protection is enabled.

## Not claimed

- No deployment, environment variable, domain, Supabase backend, or learner data
  was written by this row.
- This file satisfies the file-existence acceptance command
  `test -f docs/evidence/daniel-D04.md`. Register promotion still requires the
  separate docs PR and pushed green CI specified in
  `sprints/sprint_86_pilot_ready.md`.
