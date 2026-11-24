# Execution progress — 2026-11-24

Live log for the directive "drive all four milestones to ≥80% with proof". Updated after every
task so a budget cut-off loses nothing. Branch-per-epic from `origin/main` @ `859b9dc`.

Memory at start: 7.1 GiB total, **1.5 GiB available** (see `/tmp/work/` for full logs). Heavy
commands are serialised; no threshold, budget or timeout is raised.

## Gate cleared

`origin/main` contains both `docs/evidence/ground-truth-2026-11-24.md` and
`docs/ROADMAP-TO-FINAL.md` (verified with `git cat-file -e origin/main:<path>`). Work continued.

## R0 — Completion Register — DONE (branch `feat/readiness-register`)

- [x] 153-row `docs/readiness/register.json` seeded from the audit and roadmap
- [x] `scripts/readiness/score.mjs` (check / score / next) with fail-closed validation
- [x] `readiness:check`, `readiness:score`, `readiness:next` npm scripts
- [x] `tests/readiness/score.test.mjs` — 6/6 pass; negative cases prove gates reject
- [x] fast CI step added to `.github/workflows/ci.yml`
- [x] generated `docs/READINESS.md` (never hand-edited)
- [x] `STATUS.md` pointer line, `CHANGELOG.md`, `sprints/sprint_35_readiness_register.md`
- [x] local proof: `readiness:check` exit 0, generator exit 0

Baseline computed scores: PILOT 36.00/241 = 14.9%; V1-ACADEMIC 3.00/111 = 2.7%;
V1-POLYMATH 10.10/104 = 9.7%; WORLD-CLASS 9.60/118 = 8.1%. All NOT READY.

R0 PR #19 opened: https://github.com/dmuhoro/EasyTutor/pull/19. Local full gate passed via
pre-commit hooks (93 files / 521 tests); light gates all exit 0. CI run `45402789736` **failed**:
`readiness:check` accepted gitignored `android/` evidence locally but the clean clone did not.
Fixed by validating evidence against `git ls-files`; the regression test was proven red (gate
exited 0) then green (9/9). C46's acceptance command was corrected to the real migration-chain
script. See `docs/evidence/R0-ci-failure-and-fix.md`. Corrected head `f8a8494` re-pushed.
`gh pr checks 19`: **all green** — `build` pass, Vercel preview pass, run `45406639461`
(https://github.com/dmuhoro/EasyTutor/actions/runs/45406639461). R0 row marked `VERIFIED-IN-CI`
against that run. GT-21 fixed (`AGENTS.md` now states 92 files / 515 tests) and marked
`VERIFIED-LOCAL`. Final computed scores: **PILOT 16.1 %, V1-ACADEMIC 5.2 %, V1-POLYMATH 12.4 %,
WORLD-CLASS 10.5 %** (from 14.9 / 2.7 / 9.7 / 8.1). All still NOT READY.

Register constraint (honest): `readiness:check` validates acceptance scripts against this
branch's `git ls-files`. E1's `tests/flows/aiProxy.cors.test.ts` exists only on PR #20's branch,
so E1 rows cannot honestly be flipped to VERIFIED on `feat/readiness-register` without either a
cross-branch merge (forbidden) or weakening their acceptance command (forbidden). E1's CI proof is
recorded here and in `docs/evidence/E1-cors.md`; the rows will flip when PR #20 merges to main.

## E1 — CORS for ai-proxy — DONE at code level (branch `fix/ai-proxy-cors`, PR #20)

PR: https://github.com/dmuhoro/EasyTutor/pull/20. Commit `7de8695`, branched from `origin/main`.

- [x] Premise re-verified: non-POST → 405, no CORS headers, client sends
      `content-type`/`authorization` via plain fetch
- [x] Tests written first — RED: `Cannot find module .../handler` (exit 1)
- [x] `cors.ts` + Web-standard `handler.ts`; `index.ts` reduced to Deno adapter
- [x] GREEN: 7/7 new tests, 6/6 existing proxy tests, `check:ai-boundary` PASS
- [x] `ALLOWED_ORIGINS` named in `.env.example`; evidence + sprint + CHANGELOG + STATUS
- [x] Pushed, PR #20 opened
- [x] `gh pr checks 20`: **all green** on head `7de8695`, run `45405041127`
      (https://github.com/dmuhoro/EasyTutor/actions/runs/45405041127/job/138483312346)

Daniel still owns: the deployed `ALLOWED_ORIGINS` secret and any live hosted call.

## E3 — De-flake / headroom — branch `fix/e3-defake-headroom` (pushed, no PR)

- [x] GT-09 fixed: deterministic router injected via the existing `PipelineExecutor` seam into
      the one flaky quiz test; assertions and the 5 s timeout untouched.
- [x] Exact acceptance: **20/20 full suites**, 92 files / 515 tests each, `ALL_20_PASS`.
- [ ] GT-10 NOT DONE: `perf:login-route` = 732,759 / 733,000 B (241 B, 0.03 %); the 5 % goal
      needs a 36 KB architectural split. No budget was raised. No PR (two-slot cap).
- Evidence: `docs/evidence/E3-defake-headroom.md`.

## E2 — Real-stack CI — branch `fix/e2-real-stack-ci` (pushed, no PR)

- [x] `supabase/config.toml` port 54321 → 54331; fail-closed `grep` pin in CI.
- [x] `real-stack` CI job: CLI 3.0.0, start, db reset, build, `e2e:full`, trace upload.
- [x] Local: start exit 0 on `:54331`, db reset 40 migrations, build exit 0.
- [ ] `npm run e2e:full` **red** (1 passed, 1 failed): stale assertion at
      `tests/e2e/coreLoop.demo.spec.ts:193` expects `Flagship Module` (AI Literacy) after reload,
      but `app/_layout.tsx:257-260` intentionally routes to Home. Not weakened. Docker-layer
      cache also open. Evidence: `docs/evidence/E2-real-stack-ci.md`.

## E5 — RLS matrix in CI — branch `fix/e5-dependency-vulns` (pushed, no PR)

Note: the roadmap's E5 is RLS-in-CI; dependency vulnerabilities are part of E6.

- [x] Hardened local proof: `rows=247 pass=247 fail=0 blocked=0`, exit 0.
- [x] Negative control (`RLS_PROOF_UNHARDENED=1`): `pass=70 fail=177`, exit 0 **because** the
      harness detected the defect — the gate is not vacuous.
- [x] Fail-closed `rls-matrix` CI job with both steps. `VERIFIED-IN-CI` withheld: no PR slot.
- Evidence: `docs/evidence/E5-rls-matrix-ci.md`.

## PR cap

Only #19 (R0) and #20 (E1) are open. E3/E2/E5 were pushed as branches with local proof only;
CI cannot run on a bare branch push under the allowed remote actions.
