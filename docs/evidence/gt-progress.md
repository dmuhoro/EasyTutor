# Ground Truth Audit — Live Progress Log

Branch: `audit/ground-truth-2026-11-24` from `origin/main` @ `4a34ceb`
Started: 2026-11-24
Rule: only commands run this session count as evidence. Claims are marked CLAIM.

---

## A. DELIVERY AND CI TRUTH — DONE (2026-11-24)

- HEAD = `4a34ceb` = `origin/main`. Branch `audit/ground-truth-2026-11-24` created from it.
- **PROMPT PREMISE STALE**: prompt says main includes PRs #3-#6 only. Reality: PRs #3–#17 are
  merged; latest tag `v1.16.0`; package.json version `1.16.0`.
- Working tree at start carried 4 modified docs files (uncommitted) — CHANGELOG.md, STATUS.md,
  `docs/evidence/2026-11-24-verification-and-secret-boundaries.md`,
  `sprints/sprint_34_verification_and_secret_boundaries.md`. Carried onto audit branch untouched.
- Tags: v1.16.0, v1.15.0, v1.14.0, v1.13.0, v1.12.0, v1.11.0, v1.10.0, v1.0.1, plus
  `study-freeze-2026-11-14`, `pre-purge-2026-11-02`, `v1-learning-intelligence`.
- Open PRs: **0**. All 15 listed PRs MERGED.
- Last 12 CI runs on main: **12/12 success** (2026-11-19 → 2026-11-24).
- Last 31 runs on main: 19 success / **12 failure**; newest failure `44050144294` @ `cae99d9`
  2026-11-17, cause = typecheck: `tests/e2e/axe-a11y.test.ts(2,28) TS2307 Cannot find module
  '@axe-core/playwright'` + `TS7006 implicit any`. Pre-dates the M1 merge; fixed since.
- Workflow inventory: **exactly ONE workflow** `.github/workflows/ci.yml`, one job `build`,
  status check name **`build`** (job id). Steps (18): checkout, node 22.13, npm ci,
  check:imports, check:ai-boundary, typecheck, lint, test, lint:cycles,
  validate_boundaries.js, guard:secret-exposure, guard:public-env, qa_runner.js,
  playwright install chromium, build, guard:dist, perf:budget, perf:login-route, e2e:smoke.
- **NO Supabase CLI job, NO e2e:full job, NO auth-flow integration job, NO npm audit job,
  NO governance audit job in CI.** (F5 gap, P1.)
- Local gates that CI does NOT run: `audit:governance`, `e2e:full`, `test:auth-flow`,
  `perf:lighthouse`, `doctor`.
- CI steps NOT in AGENTS.md local gate list: check:imports, check:ai-boundary, lint:cycles,
  guard:secret-exposure, guard:public-env, guard:dist, perf:budget, perf:login-route, e2e:smoke.

## B. GATES FROM A CLEAN CLONE — IN PROGRESS (2026-11-24)

Clean clone: `/tmp/audit/clean` @ `4a34ceb`, `npm ci` EXIT=0.
Memory at start: 1.2 GiB avail (Android Gradle build active, not killed). Later 2.3 GiB.

| Gate | Result | Wall / note |
|---|---|---|
| typecheck (`tsc --noEmit`) | **PASS** | 16.2s, 653 MB peak |
| lint | **PASS** | 0 errors, **150 warnings**, 12.8s |
| test (default parallel) | **PASS** | **92 files / 515 tests**, 32.5s, 242 MB |
| test serial run 1 | **PASS** | 92/515 |
| test serial run 2 | **PASS** | 92/515 |
| test serial run 3 | **PASS** | 92/515 |
| quiz.wrongAnswers solo ×20 | **20/20 PASS** | no failure reproduced |
| check:imports | PASS | 423 files |
| check:ai-boundary | PASS | no disabled direct rail; Ollama default URL empty |
| lint:cycles | PASS | 0 errors, 12 warnings |
| guard:secret-exposure | PASS | 449 files |
| guard:public-env | PASS | 2 EXPO_PUBLIC_* names |
| guard:dist | PASS | 449 files incl. exported bundle |
| validate_boundaries.js | PASS | 0 violations |
| governance_audit.js | PASS w/ 2 WARN | raw Supabase: lib/recommendations.ts, lib/trendEngine.ts |

**Flake register (this session):** ZERO failures in 1 parallel + 3 serial + 20 solo runs.
`quiz.wrongAnswers` root cause is documented in the test itself: it used the real retrieval
path, so results depended on localhost Ollama reachability and an empty FTS table produced
`0 >= 2`. Fix = mock the retrieval boundary. Verdict: **the test was environment-coupled, not
a product bug**; structurally fixed. The "timed out in the QA runner" claim is unsupported —
`scripts/qa/qa_runner.js` sets no timeout (and `execSync` default is unlimited).

**CI-vs-local gate gap:** CI omits `governance_audit.js` (local QA runner runs it),
`test:auth-flow`, `e2e:full`, `perf:lighthouse`, `doctor`. CI runs nothing against Supabase.

### FLAKE REPRODUCED — `quiz.wrongAnswers` (2026-11-24)

- In-suite loop: **1 failure in 20 full-suite runs** (run 15). Failure:
  `tests/flows/quiz.wrongAnswers.test.ts > PipelineExecutor Quiz Question Generation >
  generates structured single question...` → **Error: Test timed out in 5000ms**.
  Suite at that run: 1 failed | 91 passed files, 1 failed | 514 passed tests.
- Solo, same file, 20/20 pass; the failing test's own duration solo = **221–285 ms**.
- No artificial delay in `src/intelligence/pipelines/pipelineExecutor.ts`.
- `vitest.config.js` sets `maxWorkers: 4` (already cut from 8) and relies on vitest's
  default **5000 ms** per-test budget; the test cold-loads the store → learning-port graph.
- **Verdict: the TEST is the cause** (cold-load + CPU starvation against a fixed 5 s budget),
  not product logic. The earlier "0 >= 2" CI failure was a different, already-fixed cause
  (real retrieval path / Ollama reachability; now stubbed at the module boundary).
- Correct fix is to remove the cold-load (warm the port in setup or stub the executor's port),
  **not** to raise the 5000 ms budget (Constitution / AGENTS rule: never raise a threshold).
- CI has been green 12/12 on main since, so the flake is latent, not currently red.

## C. CAPABILITY MATRIX — DONE
49 rows in `docs/evidence/ground-truth-2026-11-24.md` §3.
Totals: VERIFIED (CI/local) 12 · IMPLEMENTED-UNPROVEN 13 · PARTIAL 16 · MISSING 8.

## E. SECURITY AND PRIVACY — DONE
- Secret scan: 909 tracked files, 1 false positive (vendored Supabase dashboard blob);
  last 100 commits **0 hits**. Exported bundle guard PASS (494 files).
- RLS: **33/33 tables** have RLS; matrix **247/247 rows across 34 tables** PASS
  (`run_rls_matrix_local.sh`). NOT in CI.
- ai-proxy: JWT auth, atomic 200/day cap, 16 KB body, 1000 tokens, no key echo,
  model allowlist 2. **No CORS / no OPTIONS → web cannot call it.**
- npm audit production: 34 (2 low, 13 moderate, 18 high, 1 critical `shell-quote`).
- consent / export / delete: implemented, **0 UI imports**.
- Migrations from zero: **40 applied**, exit 0 (`supabase db reset --no-seed`).

## G. STITCH / UI — DONE (partial screenshots)
35 manifest screens, 33 mapped to implementations; 30/33 zero raw hex; 13/33 zero `t()`;
4 French/Swahili designs map to English screens. App-wide 953 raw hex / 48 files.
`/login` 390px screenshot: `/tmp/audit/login-390.png`. Other 34: NOT RUN (need `:54331` stack).

## D. USER JOURNEYS — PARTIAL
`e2e:smoke` PASS 9/9. `e2e:full` **NOT RUN**: spec asserts `:54331`, `config.toml` binds
`:54321`, no committed override; editing config is a source change (forbidden this session).

## F. PERFORMANCE — PARTIAL
login-route 732,759 B (241 B headroom); total JS 882.0 KB gzip; entry 429.2 KB.
Mobile Lighthouse NOT RUN (no mobile preset; box under load). Desktop numbers reused as CLAIM.

## H. COST — DONE (assumptions stated)
200 calls/user/day cap; assumed 500k Groq TPD → ~11–40 learners. `estimatedCostUsd` always 0.

## I. DOCS TRUTH — DONE
AGENTS.md:28 stale (174 vs 515); STATUS.md:61 46 vs 40 migrations; minor guard/warning drift.

## J. BACKLOG — DONE
4 TODO/FIXME; 1 skipped test; 0 archive imports; 4 unused deps; 150 lint warnings;
stray root files (`Anthropic` 4.6 MB, zero-byte timestamp file, vendored dashboard blob).
