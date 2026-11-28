# Sprint 90 — D10 / D03 / D08 / device / tag execution probe

**Date:** 2026-11-28 · **Base:** `main` `45cd3ae` · **Authority:** the owner explicitly
granted execution of `D10`, `D03`/`D08`, device sign-in (only after a signed APK
exists), no action for deferred `D11`, and the final tag only after an exact
`TAG v1.17.0` reply plus the remaining critical proofs.

No gate file (`daniel-D10.md`, `daniel-D03.md`, `daniel-D08.md`) was created: none
of the facts those files must prove was obtained. No credential value, token,
fingerprint, learner data or billing field is recorded here — only variable names,
public URLs and command results.

## D10 — production Auth URLs and Google OAuth callback

Read-only observation with the authenticated Supabase CLI and Vercel CLI:

- `supabase config diff --output-format json` (paths and remote values only):
  - `auth.site_url` remote = `https://easytutor-ten.vercel.app`.
  - `auth.additional_redirect_urls` remote = `["http://localhost:8081"]`
    — the production host is **not** in the allow-list. This is a real defect.
  - `auth.external.google.enabled` remote = `true`. The client id exists
    remotely but is not reproduced here; the Google Cloud callback is not
    observable from this machine.
- `vercel api /v1/projects/easytutor` production aliases:
  `easytutor-ten.vercel.app`, `easytutor-dmuhor01.vercel.app`,
  `easytutor-git-main-dmuhor01.vercel.app`. No custom domain exists for the
  project (`vercel domains ls --scope dmuhor01` lists only an unrelated domain).
- `supabase secrets list --project-ref iypolnvuwgdxzxviyxqr` exposes secret
  **names only**; the live Supabase project is reported as `production`.
  `GROQ_API_KEY` is configured there by name. Fingerprints are not recorded.

**Blocked:** the CLI has no targeted auth-config update subcommand. `supabase
config push` would apply the whole local file, and the diff reports 19 changes
(including 14 remote updates), so a blanket push would silently overwrite
unrelated production settings. The Supabase callback
`https://iypolnvuwgdxzxviyxqr.supabase.co/auth/v1/callback` is derivable from the
project ref but was **not** observed in Google Cloud Console, and the console
requires owner credentials. No write was attempted. `D10` stays `MISSING`.

## D03 — staging Supabase project and migrations

- `supabase projects list --output json` returns exactly one project:
  ref `iypolnvuwgdxzxviyxqr`, name `easytutor`, region `ap-southeast-2`,
  status `ACTIVE_HEALTHY`. `supabase secrets list` labels it `production`.
- The Vercel side of staging exists from `D04`: project `easytutor-staging` with
  SSO protection, but no deployment aliases or production domains.
- Earlier attempts recorded in `docs/evidence/sprint86-delegated-blockers.md`:
  project creation returned `Forbidden`; persistent branch creation returned
  HTTP 402 `entitlement_required` (`branching_limit`, Pro plan or above).

**Blocked:** no Supabase staging project exists, no migration has been applied to
one, and the plan/permission obstacle is unchanged. `D03` stays `MISSING`.

## D08 — Supabase plan and egress limits

- `supabase orgs list --output json` again returned HTTP 403
  `Missing required permission(s): organizations_read`.
- `supabase projects list` returns no plan or egress field.
- Vercel's Hobby plan is known from `D09`, but it says nothing about the
  Supabase plan or its egress allowance.

**Blocked:** Supabase plan and egress limits remain UNVERIFIED. `D08` stays
`MISSING`.

## Device sign-in

`/tmp/opencode/work/apk/build-lowmem.status` still reads
`EXIT=TERMINATED_AFTER_12H_NO_APK` and no release APK exists. The owner's
delegation was conditional on a signed APK, so no device command was run.

## D11 / tag

`D11` was explicitly deferred earlier; no action. No `v1.17.0` tag was created:
the exact reply `TAG v1.17.0` has not been given and critical rows remain open.

## CI note for the D07 docs PR

PR #76 first ran CI `46154260642` attempt 1, where the authenticated-Home axe
test failed on a serious `color-contrast` violation (white `Retry` text on
`#ef4444`, ratio 3.76, in the profile-error banner at `app/_layout.tsx:351-359`).
The docs-only diff cannot have caused it, and `main` run `46148445282` was green;
the failing job alone was re-run and passed. This was a **transient rendering of a
real error-state contrast defect**, not proof that the defect was fixed. The test
was not changed. Sprint 91 subsequently fixed that defect with a forced-error
red/green control (`docs/evidence/S91-error-banner-contrast.md`); the successful
rerun did not hide it.
