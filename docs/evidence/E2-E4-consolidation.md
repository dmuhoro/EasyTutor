# E4 privacy + E2 real-stack consolidation (2026-11-24)

Branch `feat/consolidate-e2-e4`, based on `main` at `c8c258c` (R0 + closure + E1 merged).

## What landed

- Cherry-picked `440fb9d` (E4 governed deletion + settings privacy surface). `CHANGELOG.md` and
  `STATUS.md` conflicts were resolved by keeping **both** sides verbatim.
- Cherry-picked `57ab4ea` (pinned Supabase API port 54331, added a `real-stack` CI job that runs
  `npm run e2e:full` from committed migrations) and `13534c9` (corrected stale e2e selectors).
  Same conflict policy: no section dropped, no assertion changed.
- `supabase/config.toml` now permanently pins API port `54331`; the previous auth proof no longer
  needs a temporary edit.

## Executed acceptance proof

| Gate | Command | Result |
|---|---|---|
| Privacy boundary + UI | `npm run test -- tests/flows/privacy.surface.test.ts tests/screens/privacy.settings.test.tsx` | **2 files / 8 tests passed** — governed DELETE across owned tables, signed-out refusal, fail-closed multi-table deletion, unregistered table refusal, consent/export refusal, and three settings-route actions with destructive confirmation |
| Real-stack walkthrough | `npm run e2e:full` against the running local Supabase stack (`API_URL=http://127.0.0.1:54331`, 40 migrations) | **3 passed (8.8 s)** |
| Full suite | pre-commit hook on each cherry-pick | **98 files / 546 tests passed** on the final commit |

The known load-dependent quiz timing flake (`tests/flows/quiz.wrongAnswers.test.ts`, GT-09) failed
twice at 5 s under memory pressure and passed on retry; it also passed alone (5/5). No timeout,
assertion, budget or test was changed to obtain green.

## Rows advanced

C39, C40, C41, E4-T1 and GT-07 → `VERIFIED-LOCAL` on the 8 privacy tests. E2-T1 and GT-08 →
`VERIFIED-LOCAL` on `npm run e2e:full` plus the CI job definition.

PILOT **20.0 → 24.4 %** (`58.70/241`, open P0 24 → 19). Other milestones unchanged; all remain
`READY=NO`.

## Real CI failure and boundary fix

The first PR run (`45479981439`, job `138750182288`) failed the new `real-stack` job: the sign-up
test waited 120 s for `/auth/v1/signup` and timed out. Root cause: Expo inlines `EXPO_PUBLIC_*`
into the bundle **at build time**, but the job exported only `E2E_*` variables, so the built app
had no Supabase endpoint. The workflow now exports `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` from `supabase status -o env` before `npm run build`; values are
written to `$GITHUB_ENV` and never printed. The app's https-only guard and the harness's
http→https rewrite are unchanged — no test, timeout, budget or assertion was weakened.

Reproduced locally with the same exports: `npm run build` exit 0 and `npm run e2e:full`
**3 passed (8.6 s)**.

## Not claimed

- C49 (CI proves the real learner journey) stays `MISSING` until `gh pr checks --required` is
  observed green on this PR's head; local `npm run e2e:full` alone does not satisfy it.
- Deployed Supabase/Vercel secrets and live hosted AI remain Daniel-only steps.
