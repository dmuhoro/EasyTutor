# E2 — Real-stack CI + reproducible e2e

Branch `fix/e2-real-stack-ci` from `origin/main` @ `859b9dc`. No PR opened (PR cap of two:
#19 R0 and #20 E1 are open). No threshold, budget or timeout was raised.

## Done — port pin, real-stack job, green e2e

### Red → green on the real boundary

Before the change, `supabase status -o env` reported `API_URL="http://127.0.0.1:54321"` while
`tests/e2e/coreLoop.demo.spec.ts:109` asserts the URL contains `:54331`. The harness could only
pass on a host where a second project happened to occupy 54321 and bumped easytutor to 54331 —
environment-dependent, not reproducible.

After pinning `supabase/config.toml:10` to `port = 54331` the stack reports `:54331` on every
host. CI now has a fail-closed `real-stack` job: checkout → Node 22 → `npm ci` → Supabase CLI
3.0.0 → `grep -q '^port = 54331$'` pin check → `supabase start -x studio,imgproxy` → `supabase db
reset --no-seed` → deterministic `E2E_*` export (values never logged) → `npm run build` →
Playwright chromium → `npm run e2e:full` → `playwright-traces` artifact on failure. YAML parsed:
jobs `build`, `real-stack`.

### Stale selectors corrected — named and justified, not weakened

Two assertions in the demo harness referred to strings that no longer exist in the product:

1. `tests/e2e/coreLoop.demo.spec.ts:193` expected `Flagship Module`, a literal found **only** in
   `screens/ai_literacy/index.tsx:390`. Completing onboarding deliberately routes to Home via
   `router.replace('/')` (`app/_layout.tsx:257-260`), where the same flagship entry point is
   rendered by `screens/tabs/index.tsx:539-552` as `t('flagshipLearning')` → "Flagship learning".
   The old assertion was unsatisfiable in this flow; its earlier "3 passed" claim in
   `docs/evidence/wave1-5-demo.md:67` was false confidence. Replaced with one exact-text
   visibility assertion on the real affordance.
2. `tests/e2e/coreLoop.demo.spec.ts:207` expected the pre-i18n placeholder `Ask a question...`;
   the i18n migration changed it to `t('askQuestion')` = `Ask a question about this topic...`
   (`src/locales/en.json:60`). Replaced with that exact string.

In both cases the assertion count, matcher specificity (exact text) and the 15 s timeout are
unchanged. No test was skipped, renamed, deleted or relaxed to obtain green. The correction makes
the harness assert what the product actually renders instead of unreachable literals.

## Acceptance proof (exact epic commands)

| Command | Result |
|---|---|
| `supabase start -x studio,imgproxy` | exit 0, `API_URL` on `:54331` |
| `supabase db reset --no-seed` | exit 0, 40 migrations applied |
| `npm run build` | exit 0, `Exported: dist` |
| `npm run e2e:full` | **exit 0, 3 passed (12.9 s)** |
| `supabase stop` | exit 0 |

Logs: `/tmp/work/e2e-db-reset-final.log`, `e2e-build-final.log`, `e2e-start-final.log`,
`e2e-full-acceptance.log`. Earlier red runs retained at `e2e-full.log` and `e2e-full-fixed.log`.

No staging or production project was touched; no secret was printed or committed.

## Open

Docker-layer caching (an E2 task) is not implemented: GitHub-hosted runners do not persist
`/var/lib/docker` and no cache service was provisioned. Image pulls remain uncached — reported as
open, not silently claimed. No PR, so `VERIFIED-IN-CI` is not claimed for this head.

## Honest handover

DONE locally and in CI config: deterministic port, real-stack job with trace upload, and a green
3-test real-browser walkthrough against real GoTrue/PostgREST. Daniel-only: none for this proof;
staging credentials would be needed only for a staging variant.
