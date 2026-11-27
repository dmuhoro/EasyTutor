# Sprint 86 — Pilot-ready weekend (spec, written before code)

**Date:** 2026-11-27 → 2026-11-29 EAT
**Baseline:** `docs/evidence/weekend-baseline.md` · main `74d002c` · tag `v1.16.7`
**Directive:** the executive weekend directive supplied by the owner, adopted
verbatim where it does not conflict with `CONSTITUTION.md`, `AGENTS.md`, the
ADRs or the readiness register. Where they conflict, the Constitution and the
register win and the difference is reported.

## 1. Final state

### 1.1 Weekend target — PILOT READY

PILOT is `READY` only when `npm run readiness:score` reports score >= 80%,
`openP0=0` and `criticalNotCI=0` for PILOT, and every PILOT critical-path row is
`VERIFIED-IN-CI`. In addition the weekend target requires:

- `DEC-01`…`DEC-05` ratified by Daniel in the register's named evidence files;
- `docs/evidence/daniel-D03.md`, `daniel-D04.md`, `daniel-D02.md`,
  `daniel-D05.md`, `daniel-D10.md` written by Daniel;
- `scripts/live-proof-checklist.md` 10/10 ticked with screenshots outside the
  repo;
- `G-07` and `G-08` closed at the real boundary with pre-registered red controls;
- `v1.17.0` tagged and remote-verified after the final green main run.

A missed target is reported as missed. No row is re-scoped, re-prioritised,
removed or given a weaker acceptance command to reach it.

### 1.2 Daily north star — V1 complete

All four milestones `READY`; `F1`–`F8` `VERIFIED-IN-CI`; R1–R8 met; docs true;
every shipped upgrade versioned, changelogged, tagged and remote-verified.

### 1.3 Product state in plain language

A learner signs up on web or Android, chooses a governed portal, imports
private notes, asks a cited question, takes a quiz or mock exam, sees
deterministic mastery and due reviews, continues offline, syncs idempotently,
and always sees the true AI/source/sync state — with RLS isolation, privacy
controls, accessibility, performance budgets, cost caps, monitoring, truthful
docs and a tagged release.

## 2. Premise verified before this spec

`npm run readiness:next` at baseline returns `DEC-02`, `C45`, `D03`, `D05`,
`D10`, `DEC-03`, `DEC-04`, `E3-T2`, `D04`, `D06`, `D07`, `D11` in wave order.
The owner blocks are decisions, accounts, secrets, devices and merges; the
agent-owned blockers are two gate-truth defects (`G-07`, `G-08`), two flake /
headroom proofs (`E3-T2`, `E3-T3`), cloud smoke automation, ops runbooks and
documentation truth.

`G-07` premise checked at the source: `src/infrastructure/database/index.ts`
returns `globalThis.__MOCK_SUPABASE_CLIENT__` before checking the real client,
so a test seam is reachable from the production path. This is the real
boundary; a new helper would be another false gate.

`G-08` premise checked at the scripts: `scripts/architecture/validate_boundaries.js`
scans only `app/`, `components/` and `store/` for a short import list, and
`scripts/qa/check-ai-boundary.mjs` has a fixed scan directory list. A new
top-level source directory is silently unscanned.

## 3. Non-negotiables

- Spec first; one concern per commit; red control before green; enforcement at
  the real boundary; proof must exercise the real path.
- Never weaken or raise a test, threshold, budget, matcher, timeout, assertion
  or suite ratchet. Keep `118 files / 622 tests` unless a test is added and the
  exact ratchet is updated in the same change. Ratchets may only decrease.
- Capture red output at `docs/evidence/<ROW>-red.txt` before the fix; commit
  test + fix + evidence together with hooks on; never `--no-verify`. A hook
  flake is retried once; a second failure stops the sprint.
- Remote actions allowed: `git push -u origin <branch>`, `gh pr create`,
  read-only `gh`, `gh workflow run flake-proof.yml|staging-smoke.yml`, and the
  single tag push in section 8. Never push `main`, force-push, merge, deploy,
  run `vercel`, or touch dashboards.
- At most two PRs open. Daniel merges only in the listed windows.
- Never read, print, log or commit a secret or a learner's personal data.
  Initials only in session evidence; secrets referenced by name.
- Never edit a row's priority, milestone, `depends_on`, critical-path flag or
  acceptance command to raise a score. Adding rows and honest downgrades are
  allowed; a questionable row becomes a DEC proposal for Daniel.
- Docs move with behaviour: `STATUS.md`, `CHANGELOG.md`, `README.md`,
  `COMPLETION_TRACKER.md`, `docs/READINESS.md`, `docs/readiness/register.json`
  in the same change as the behaviour they describe.
- One heavy command at a time; logs in `/tmp/opencode/work/`; long proofs in CI.

## 4. Explicit non-goals for this weekend

Unwired library / setup / progress screens, diagrams, Stitch parity
perfection, bulk `any` and warning cleanup, Play Store, iOS, payments, free-text
essay marking, default live Ollama, history rewriting and credential rotation
inside an agent session.

## 5. Workstreams and real boundaries

### WS0 — Decisions and proposals (docs only)

Write `docs/decisions/proposals/DEC-01.md`…`DEC-05.md` and `DEC-06.md`
(licence), each with: question, recommended default, data from the register,
cost of delay, and a paste-ready ratification block. Existing full proposals
at `docs/decisions/DEC-0N-*.md` are cross-referenced, not overwritten.

The canonical gate stays `test -f docs/evidence/DEC-0N.md` and Daniel alone
writes those files. The agent never creates or edits them. Defaults:

- `DEC-01`: 10 learners, 7-day pilot, Mathematics only, Android + web; 30 only
  after a zero-P0 review.
- `DEC-02`: KCSE first, then Kenya TVET Automotive Science Principles, then one
  university pack; reviewer named by Daniel; packs remain DRAFT until signed.
- `DEC-03`: keep existing budgets; mobile Lighthouse floor proposed from
  median-of-3 measured baseline, not aspiration; ratchet to 80 after baseline.
- `DEC-04`: PWA for the pilot, signed APK for device proof, Play Store deferred.
- `DEC-05`: existing per-user cap plus a global daily cap and a visible degrade
  message; free tier only; $0 committed spend until ratified.
- `DEC-06`: the README claims MIT while no `LICENSE` file exists; default is to
  assert no licence and remove the badge unless Daniel supplies one.

Promotion: the Daniel-authored evidence file exists on `origin/main`.

### WS1 — Staging and live proof

Write `docs/runbooks/staging-setup.md` with exact commands Daniel types:
`supabase link --project-ref <STAGING_REF>`, `supabase db push`,
`supabase secrets set GROQ_API_KEY=<value> ALLOWED_ORIGINS=<exact origin, no
wildcard>`, `supabase functions deploy ai-proxy`, Vercel staging env (public
Supabase URL and anon key only), Auth site URL and redirect URLs, one dedicated
staging test user with auto-confirm, ten pilot accounts pre-provisioned, and
GitHub secrets by name (`STAGING_URL`, `STAGING_SUPABASE_URL`,
`STAGING_SUPABASE_ANON_KEY`, `STAGING_TEST_EMAIL`, `STAGING_TEST_PASSWORD`).

Build `scripts/smoke/cloud.mjs` + `npm run smoke:cloud` and
`.github/workflows/staging-smoke.yml` (`workflow_dispatch`). Assertions:

1. `OPTIONS` preflight from the allowed origin returns 204 with an exact
   `Allow-Origin`; a disallowed origin gets no header;
2. unauthenticated `POST` is rejected;
3. the signed-in staging user gets a non-empty answer with source
   `hosted_proxy`;
4. anon cannot read any user table taken from `tableGovernance`;
5. import three fixture chunks, retrieve with valid citations, then clean up;
6. a second user cannot see them (skipped and reported if no second user).

Print statuses and timings only, mask secrets, never echo bodies. Red control:
point (1) and (2) at a wrong origin and record the failure in `docs/evidence/`.

Promotion of `C45`, `D03`, `D02` to `VERIFIED-IN-CI` only on a green
`staging-smoke` run URL for the exact `main` SHA after Daniel confirms secrets.
If the register cannot express human-only or live rows, propose a DEC; do not
change the rule unilaterally.

### WS2 — G-07 at the real boundary (PR-B)

`src/infrastructure/database/index.ts:20–29` must refuse a mock in production.
Implement one runtime resolver: the mock is allowed only in a test runtime
(`NODE_ENV=test` or `VITEST`) or with an explicit `EASYTUTOR_ALLOW_MOCK=1`
outside production. Missing or invalid config otherwise throws a typed
`BackendUnavailableError`; the app shows a blocking accessible "service
unavailable" screen with Retry. Never a silent mock.

Red: the new test fails on current code; save the log. Then green:
`npx vitest run <new test>`, `npm test`, boundary validator, `npm run build`.

### WS3 — G-08 exhaustive gate scope (PR-C)

`scripts/architecture/validate_boundaries.js` and
`scripts/qa/check-ai-boundary.mjs` must scan every top-level source directory
or explicitly exclude it with a reason; an unclassified new directory fails
closed. Keep fixtures under `tests/fixtures/boundary/` with a test asserting
non-zero exit on them and zero on the real tree. Red: show both gates failing
on a temporary violation in a previously unscanned directory, then remove it.

### WS4 — E3-T2 / E3-T3

`E3-T2`: reproduce the in-suite `quiz.wrongAnswers` failure first (1 in 20,
5,035 ms vs 221–285 ms solo). Remove the contention-sensitive cost; if only
worker contention remains, cap workers with before/after evidence. Proof:
20 consecutive full runs, zero failures, logs in `/tmp/work/runs/`, plus a
green `flake-proof.yml` run URL on `main`.

`E3-T3`: `npm run perf:login-route` headroom >= 10 KB by deferring or removing
bytes attributed by source map; the ratchet is lowered in the same commit;
`npm run perf:budget` stays green.

### WS5 — Device and PWA proof

Daniel connects the Redmi (`adb devices`) and signs in himself. The agent
forwards `tcp:9222` to `localabstract:chrome_devtools_remote`, connects over
CDP, checks `Page.getInstallabilityErrors` is empty, verifies standalone launch
after Daniel taps Install, cold load and TTI on throttled 4G, soft keyboard vs
inputs, font scale 1.3, offline mid-question and recovery, deep-link reload and
sign-in/out. Logcat is filtered to Chrome's pid; every changed setting is
restored. Evidence: `docs/evidence/D-device-<date>.md`, screenshots outside
the repo, no personal data. Fix only P0/P1 defects found; log the rest.

### WS6 — R1 observer sheet

R1 is `scripts/live-proof-checklist.md` 10/10 ticked with screenshots. Provide
`docs/pilot/observer-sheet.md` (10-minute journey script, timings, friction
notes). Daniel writes `docs/evidence/R1-session-NN.md` with initials only; the
agent counts and summarises, never fabricates a tick.

### WS7 — Operations runbooks (PR-H)

`docs/runbooks/{rollback,secrets-rotation,incident,deploy,pilot-support}.md`
with exact commands: rollback to a tag (Daniel runs), rotate Groq, Stitch and
Supabase keys, check provider quota, disable AI server-side, contact users.
Monitoring: no new vendor without Daniel; write check lists and alert
thresholds for an uptime monitor on `/manifest.json` and `ai-proxy` health,
which Daniel creates. Daniel rehearses one rollback on staging; the agent
records timings.

### WS8 — Docs truth and release (PR-I)

README: replace the hard-coded `616` test badge with a CI status badge; remove
or verify the licence claim (never add a licence unilaterally); remove the Expo
Go claim unless a documented run proves it. `STATUS.md`, `CHANGELOG.md`,
`README.md`, `COMPLETION_TRACKER.md`, `READINESS.md` and `register.json` move
with code; register promotions happen in daily register-sync PRs citing green
runs on the exact `main` commit (a PR cannot cite its own future CI).

## 6. Order and time boxes (EAT)

Budget ~6 min per push (local hook ~90 s + CI ~3 min). Daniel-blocked time is
filled with the next agent-owned item; a skipped block leaves its rows open.

| Window | Owner | Unit |
|---|---|---|
| Fri 17:20–17:45 | agent | baseline + this spec + burn-down scaffold |
| Fri 17:45–18:50 | agent | PR-A: proposals, staging runbook, observer sheet |
| Fri 18:50–19:00 | Daniel | merge window 1: PR-A; Daniel writes `DEC-0N.md` |
| Fri 19:00–20:45 | Daniel / agent | staging setup (WS1); agent PR-B (G-07) |
| Fri 20:45–21:15 | agent | PR-C (G-08) |
| Fri 21:15 | Daniel | merge window 2: PR-B, PR-C |
| Fri 21:15–22:00 | agent | PR-D (cloud smoke + workflows), RS-1, burn-down |
| Sat 08:00–09:30 | Daniel / agent | GitHub secrets, `staging-smoke`; agent starts `flake-proof` then E3-T3 |
| Sat 09:30–12:00 | agent | PR-E (headroom), PR-F (flake fix) |
| Sat 12:00 | Daniel | merge window 3 + feasibility gate |
| Sat 12:30–15:30 | Daniel + agent | device/PWA proof (WS5) |
| Sat 14:00–17:00 | Daniel | R1 sessions batch 1 |
| Sat 15:30–18:00 | agent | PR-H (ops runbooks) |
| Sat 18:00 | Daniel | merge window 4 |
| Sat 19:00–20:30 | agent | RS-2, burn-down, handover; 20:30–22:00 buffer |
| Sun 08:00–11:00 | Daniel | R1 sessions batch 2; agent fixes P0/P1 (max 2 PRs) |
| Sun 11:00–14:30 | agent | PR-I docs truth + release prep |
| Sun 12:30 | Daniel | merge window 5: fix PRs |
| Sun 14:30–16:00 | agent | RS-3 citing green main runs; release PR `1.17.0` |
| Sun 16:00 | Daniel | merge window 6 + `TAG v1.17.0` reply |
| Sun 16:00–19:00 | agent | fresh-clone full gate, final score, handover |
| Sun 19:00–21:00 | — | buffer |

Hard stops are caps, not targets. Verification is never compressed to protect
the date.

## 7. Promotion and burn-down

`VERIFIED-IN-CI` requires the change on `origin/main`, green CI on that exact
SHA with a cited run URL, and `readiness:check` passing. Local-only proof is
`VERIFIED-LOCAL`. Daniel-owned rows move only from Daniel-authored evidence.

The burn-down template and promotion rule live at `docs/evidence/burndown.md`.
Daily headline: `DAY n: PILOT x% (P0 a, CP-not-CI b) | ACADEMIC x% | POLYMATH x% | WORLD x% | next blocker: <ID> (<owner>)`.

## 8. Release

Release PR bumps `1.17.0` in `package.json`, `package-lock.json` root,
`app.json`, `STATUS.md` and `CHANGELOG.md`. After Daniel merges and replies
`TAG v1.17.0`: `git fetch origin`, `git switch main`, `git pull --ff-only`,
confirm HEAD is the merge commit, `git tag -a v1.17.0 -m "EasyTutor v1.17.0"`,
`git push origin v1.17.0`, then verify
`git ls-remote --tags origin v1.17.0` and
`git merge-base --is-ancestor v1.17.0 origin/main`. The tag describes shipped
code, never readiness; release notes state the computed scores and open P0s.

Fresh-clone final gate: `npm ci`, `npm run typecheck`, `npm run lint`,
`npm test`, boundary validator, AI-boundary checker, `npm run qa` runner,
`npm run build`, `npm run perf:budget`, `npm run perf:login-route`,
`npm run e2e:smoke`, `npm run e2e:full` (with `supabase start`),
`npm run readiness:check`, `npm run readiness:score`.

## 9. Stop conditions

Same CI failure twice; hook flake twice; free memory under 1 GB; conflicting
instructions; suspected secret exposure; register semantics that cannot be
resolved. Stop, report, wait.

## 10. Handover rule

End every block with three lists: **SAFE NOW** (item, proof path or run URL,
exact coverage), **BLOCKED** (owner, unblock action, time needed), **NOT
CLAIMED** (everything unproven). Never write ready, complete, safe, verified or
secured without a proof link. Close with a Daniel-only list sorted by time
needed.
