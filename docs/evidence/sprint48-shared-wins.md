# Shared-win readiness slice — 2026-11-25 (Sprint 48)

Closed four rows that appear in all four milestones. No timeout, threshold, assertion or budget was
changed; every status flip has executed proof below.

## C49 — real all-checks PR gate (VERIFIED-IN-CI)

- The old acceptance `gh pr checks --required` is not a usable proof on this repo: on PR #22 it
  exited **1** with `no required checks reported on the 'feat/e7-e8-e9' branch`.
- Added `scripts/readiness/check-pr-checks.mjs`: it fails closed when no checks are reported, when
  any non-skipped check is not a pass, when `build` or `Real stack (Supabase CLI + full e2e)` is not
  explicitly passing, when no GitHub Actions run URL is present, or when no PR number is supplied.
- `node scripts/readiness/check-pr-checks.mjs 22` → **PASS**, all 5 checks reported, no pending or
  failing check. Green run: <https://github.com/dmuhoro/EasyTutor/actions/runs/45560024991>.
- `tests/readiness/pr-checks.test.mjs` — **5/5 passed**, including negative cases for empty,
  pending, failing, cancelled, skipped-journey and no-run-URL results. No PR argument fails closed.

## GT-09 — quiz flow flake (VERIFIED-LOCAL)

- Root cause observed in the recorded failing run: the PipelineExecutor test used the real
  `HybridInferenceRouter`, so a provider stall hit the unchanged 5 s default test timeout.
- Injected a deterministic router through the existing `PipelineExecutor` constructor seam (the same
  seam used by `quiz.wrongAnswers.noOllama.test.ts`). Retrieval and pipeline/grading logic stay real;
  only the network edge is substituted. No timeout, assertion or skip changed.
- Acceptance `npm run test -- tests/flows/quiz.wrongAnswers.test.ts`: **20 consecutive runs, 20 pass /
  0 fail**.
- Negative control: temporarily delaying the injected router by 6 s made the same test fail **1/1**
  with `Error: Test timed out in 5000ms`; the original file was restored byte-for-byte and passed
  again. No test was weakened to go green.

## GT-12 — production audit (VERIFIED-LOCAL)

- Before: `npm audit --omit=dev --audit-level=critical` exited **1** with 34 advisories including one
  critical (`shell-quote` ≤ 1.8.4).
- A broad `npm audit fix --omit=dev` cleared the critical but upgraded runtime packages (expo-router,
  react-navigation, expo-constants/linking/updates, metro-runtime) and measured **733,079 B**, 79 B
  over the unchanged login budget. That lockfile was **reverted**, not shipped.
- Shipped fix: a narrow `overrides.shell-quote = 1.12.0` in `package.json` plus lockfile. Audit now
  exits **0**: 33 advisories remain (0 critical), recorded openly as a security backlog. Login is
  unchanged at **732,983 / 733,000 B PASS**. `npm ci` from the committed lockfile is green.

## GT-20 — unused deps and stray artifacts (VERIFIED-LOCAL)

- Removed four unreferenced declared packages: `@expo/ngrok`, `@expo-google-fonts/syne`, `axe-core`,
  `eslint-formatter-compact`; removed the now-dead syne test mock. `axe-core` still resolves through
  `@axe-core/playwright`.
- Archived, never deleted, via `git mv`: the tracked zero-byte `2026-09-13 13:47:10` file and the
  22-file, 9.3 MB vendored Supabase dashboard blob under `archive/stray/`.
- `.tmp-analytics-scripts/` and the git-ignored local `Anthropic` blob were left untouched: they are
  live tooling / local user material and are not in a clean clone.
- `npm run check:imports` → **PASS**, 441 files scanned.

## Full gate after the slice

typecheck 0 · lint 0 errors (130 warnings) · **102 files / 563 tests** · boundaries 0 · AI boundary
PASS · declared imports PASS · readiness check 0 · build 0 · QA all systems verified · login
**732,983 / 733,000 B PASS** (budget unchanged) · production audit exit 0.

Scores moved to PILOT **26.4 %**, V1-ACADEMIC **19.5 %**, V1-POLYMATH **19.2 %**, WORLD-CLASS
**14.7 %**; all `READY=NO`. `VERIFIED-IN-CI` is held for rows whose green pushed-run evidence has
not yet been promoted; only C49 has a run URL so far.
