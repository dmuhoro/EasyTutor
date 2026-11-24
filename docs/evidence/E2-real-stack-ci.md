# E2 — Real-stack CI + reproducible e2e

Branch `fix/e2-real-stack-ci` from `origin/main` @ `859b9dc`. No PR opened (PR cap of two:
#19 R0 and #20 E1 are open). No budget, timeout, assertion or test was weakened, skipped or
renamed. No secret was printed or committed.

## Done — port pin and real-stack job

### Red → green on the real boundary

Before the change, `supabase status -o env` reported `API_URL="http://127.0.0.1:54321"` while
`tests/e2e/coreLoop.demo.spec.ts:109` asserts the URL contains `:54331`. The harness could only
pass on a host where a second project happened to occupy 54321 and bumped easytutor to 54331 —
environment-dependent, not reproducible.

After pinning `supabase/config.toml:10` to `port = 54331`:

| Command | Result |
|---|---|
| `supabase start -x studio,imgproxy` | exit 0; `API_URL` = `http://127.0.0.1:54331` |
| `supabase db reset --no-seed` | exit 0; 40 migrations applied |
| `npm run build` | exit 0 (`Exported: dist`) |
| `supabase status -o env` env mapping into `E2E_*` | mapped (values never logged) |

`.github/workflows/ci.yml` now has a `real-stack` job: checkout → Node 22 → `npm ci` →
Supabase CLI 3.0.0 → `grep -q '^port = 54331$'` fail-closed pin check → `supabase start -x
studio,imgproxy` → `supabase db reset --no-seed` → deterministic `E2E_*` export → `npm run
build` → Playwright chromium → `npm run e2e:full` → `playwright-traces` artifact on failure.
YAML parsed: jobs `build`, `real-stack`.

## Not done — `npm run e2e:full` fails on a pre-existing stale assertion

```
1 failed, 1 passed (23.7s)
tests/e2e/coreLoop.demo.spec.ts:152 › setup wizard advances one step at a time, persists under RLS and survives reload
Error: expect(locator).toBeVisible() failed — getByText('Flagship Module'), element(s) not found
```

Root cause, from the real code (not a selector guess):

- `screens/setup-wizard/index.tsx:140-189` — `handleComplete()` writes the profile, sets
  `onboardingComplete(true)` and does **not** navigate to AI Literacy.
- `app/_layout.tsx:257-260` — once onboarding is complete, a user in `(auth)`, `onboarding` or
  `setup-wizard` is deliberately redirected with `router.replace('/')`.
- `screens/tabs/index.tsx:539-552` — Home renders `t('flagshipLearning')` → "Flagship learning"
  (the error-context snapshot confirms this card is present).
- `'Flagship Module'` exists only at `screens/ai_literacy/index.tsx:390`, a different route.

Therefore the assertion at `tests/e2e/coreLoop.demo.spec.ts:193` is unsatisfiable against the
product's intentional post-onboarding destination. It was introduced in commit `0c65635`, whose
evidence (`docs/evidence/wave1-5-demo.md:67`) nonetheless claimed "3 passed" — a false-confidence
claim: the redirect to `/` predates that commit (`378eab6`, 2026-05-12), and `git grep` confirms
"Flagship Module" has never existed on Home in any revision.

**I did not change, loosen, skip or rename that assertion**, and did not raise the 15 s timeout.
Changing it to a Home-screen string would make CI green while hiding a real mismatch between the
test and the product, which the operating rules forbid. The new `real-stack` CI job will stay red
until this is resolved deliberately by the product owner.

Docker-layer caching (an E2 task) was not implemented: GitHub-hosted runners do not persist
`/var/lib/docker`, and no cache service was provisioned. Image pulls remain uncached; reported as
open, not silently claimed.

## Honest handover

DONE: deterministic API port, reproducible local stack startup/reset, real-stack CI job with
trace upload, no secrets exposed. NOT DONE: `e2e:full` gate (stale assertion), Docker layer cache.
Daniel-only: none for the local proof; staging credentials would be needed for a staging variant.
