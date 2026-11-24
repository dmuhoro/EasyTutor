# Sprint 38 — E2 real-stack CI and reproducible e2e

## Context

Wave 1 epic 2. GT-11-adjacent / F5: `e2e:full` asserted `:54331` while `supabase/config.toml`
bound `:54321`, and no CI job touched a real stack. Branch `fix/e2-real-stack-ci` from
`origin/main`; no PR opened (two PRs already open).

## Spec / boundary

- Real boundary: `supabase/config.toml` (what `supabase start` reads) and `.github/workflows/ci.yml`.
- No budget, threshold or timeout changed. Two stale literals in the harness were corrected with
  explicit justification in `docs/evidence/E2-real-stack-ci.md`; assertion count, exact-text
  specificity and timeout are unchanged. No test skipped, renamed or deleted.
- No secret printed or committed; local Supabase demo credentials were mapped in memory only.

## Work done

1. Pinned API port 54321 → 54331; added fail-closed `grep` pin step in CI.
2. Added a `real-stack` CI job (CLI 3.0.0, start, db reset, build, `e2e:full`, trace artifact).
3. Diagnosed the first red run to a provably unsatisfiable `Flagship Module` assertion: the app
   intentionally routes completed onboarding to Home. Corrected it to the flagship card actually
   rendered there.
4. A previously skipped deep-link test then ran and exposed a pre-i18n placeholder literal;
   corrected to `Ask a question about this topic...` from `src/locales/en.json:60`.
5. Exact acceptance green: start 0, db reset 0 (40 migrations), build 0, **e2e 3 passed**.

## Evidence

- `docs/evidence/E2-real-stack-ci.md`
- Logs `/tmp/work/e2e-db-reset-final.log`, `e2e-build-final.log`, `e2e-start-final.log`,
  `e2e-full-acceptance.log`

## Honest handover

DONE at code/local-proof level. `VERIFIED-IN-CI` withheld: no PR slot under the two-PR cap.
Docker-layer caching remains open. Daniel-only: none.
