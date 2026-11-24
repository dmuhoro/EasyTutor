# Sprint 38 — E2 real-stack CI and reproducible e2e

## Context

Wave 1 epic 2. Ground truth GT-08 / F5: no CI job touched a real stack and `e2e:full` asserted
`:54331` while `supabase/config.toml` bound `:54321`. Branch `fix/e2-real-stack-ci` from
`origin/main`; no PR opened because two PRs (#19, #20) are already open.

## Spec / boundary

- No budget, timeout, matcher, assertion or test was changed. No test skipped or renamed.
- No secret printed or committed. Local Supabase demo credentials were read only to map `E2E_*`
  env vars in memory, never written to a file or log.
- Port pin is at the real boundary (`supabase/config.toml` is what `supabase start` reads).

## Work done

1. Pinned `[api].port` from 54321 → 54331 and added a fail-closed `grep` check in CI.
2. Added a `real-stack` job to `.github/workflows/ci.yml` (CLI 3.0.0, start, db reset, build,
   Playwright, `e2e:full`, trace artifact on failure).
3. Proved locally: stack start exit 0 on `:54331`, db reset exit 0 with 40 migrations, build
   exit 0, env mapping works.
4. Ran `npm run e2e:full`: **1 passed, 1 failed**. The failure is a pre-existing assertion at
   `tests/e2e/coreLoop.demo.spec.ts:193` expecting `Flagship Module` (an AI Literacy screen
   string) after reload, while `app/_layout.tsx:257-260` intentionally routes completed users to
   Home. Documented, not weakened.

## Evidence

- `docs/evidence/E2-real-stack-ci.md`
- Logs `/tmp/work/e2e-supabase-start.log`, `e2e-db-reset.log`, `e2e-build.log`, `e2e-full.log`

## Honest handover

DONE: port pin + real-stack job. PARTIAL: `e2e:full` is still red on a stale assertion; the CI job
correctly fails closed and must not be silenced. Docker layer caching remains open. No
Daniel-only step for the local proof.
