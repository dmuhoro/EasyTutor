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
script. See `docs/evidence/R0-ci-failure-and-fix.md`. Corrected head re-pushed; CI re-run result
recorded below once observed. No `VERIFIED-IN-CI` claimed until then.

## E1 — CORS for ai-proxy — DONE at code level (branch `fix/ai-proxy-cors`, PR #20)

PR: https://github.com/dmuhoro/EasyTutor/pull/20. Commit `7de8695`, branched from `origin/main`.

- [x] Premise re-verified: non-POST → 405, no CORS headers, client sends
      `content-type`/`authorization` via plain fetch
- [x] Tests written first — RED: `Cannot find module .../handler` (exit 1)
- [x] `cors.ts` + Web-standard `handler.ts`; `index.ts` reduced to Deno adapter
- [x] GREEN: 7/7 new tests, 6/6 existing proxy tests, `check:ai-boundary` PASS
- [x] `ALLOWED_ORIGINS` named in `.env.example`; evidence + sprint + CHANGELOG + STATUS
- [x] Pushed, PR #20 opened; CI result pending `gh pr checks 20`

Daniel still owns: the deployed `ALLOWED_ORIGINS` secret and any live hosted call.

## E3 — De-flake and headroom — NOT STARTED

## E2 — Real-stack CI — NOT STARTED

## E5 — Dependency vulnerabilities — NOT STARTED
