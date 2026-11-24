# Execution progress — 2026-11-24

Live log for the directive "drive all four milestones to ≥80% with proof". Updated after every
task so a budget cut-off loses nothing. Branch-per-epic from `origin/main` @ `859b9dc`.

Memory at start: 7.1 GiB total, **1.2 GiB free / 2.6 GiB available** (see `/tmp/work/` for full
logs). Heavy commands are serialised; no threshold, budget or timeout is raised. `origin/main`
was never pushed to, merged, tagged or deployed; remote writes were limited to epic branch pushes
and PR creation.

## Final register state (authoritative, `npm run readiness:score`)

| Milestone | Score | Open P0 | Critical not CI-verified | READY |
|---|---|---|---|---|
| PILOT | 16.1 % (38.80/241) | 30 | 14 | NO |
| V1-ACADEMIC | 5.2 % (5.80/111) | 17 | 9 | NO |
| V1-POLYMATH | 12.4 % (12.90/104) | 12 | 6 | NO |
| WORLD-CLASS | 10.5 % (12.40/118) | 12 | 7 | NO |

**The ≥80% target is NOT met.** The register now makes this measurable and CI-checkable; it does
not manufacture readiness. Next three rows: `C12` Proxy CORS, `C45` Staging environment,
`C49` CI proves the real learner journey (all still `MISSING` on the register branch — see the
cross-branch constraint below).

## R0 — Completion Register — DONE (branch `feat/readiness-register`, PR #19)

- [x] 153-row `docs/readiness/register.json`, `scripts/readiness/score.mjs` (check/score/next),
      `readiness:*` npm scripts, fail-closed validator, fast CI step, generated `docs/READINESS.md`.
- [x] `tests/readiness/score.test.mjs` — negative cases proven red then green (9/9).
- [x] PR https://github.com/dmuhoro/EasyTutor/pull/19 — **all checks green** on head `43809a0`,
      run `45414490077`. An earlier run `45406639461` on `f8a8494` was corrected after the
      validator was changed to check evidence via `git ls-files` (clean clones cannot see
      gitignored files). See `docs/evidence/R0-ci-failure-and-fix.md`.
- Scores moved 14.9/2.7/9.7/8.1 → 16.1/5.2/12.4/10.5 after E1/E3 proof was consumed.

**Cross-branch constraint (honest):** `readiness:check` validates against this branch's
`git ls-files`. E1's test exists only on PR #20's branch, so E1 rows cannot be flipped to
`VERIFIED-IN-CI` on this branch without a cross-branch merge (forbidden) or a weakened acceptance
command (forbidden). E1's CI proof is recorded below and in `docs/evidence/E1-cors.md`; the rows
flip when #20 merges to main. For the same reason this progress log is committed locally on the
R0 branch but **not pushed**: a new head would invalidate the green CI run recorded above.

## E1 — CORS for ai-proxy — DONE, VERIFIED-IN-CI (branch `fix/ai-proxy-cors`, PR #20)

- PR https://github.com/dmuhoro/EasyTutor/pull/20 — **all checks green** on head `7de8695`,
  run `45405041127` (https://github.com/dmuhoro/EasyTutor/actions/runs/45405041127/job/138483312346).
- Web-standard `handler.ts` + `cors.ts`, thin Deno adapter, 7/7 new tests; tests written first
  (RED: missing module → GREEN). `ALLOWED_ORIGINS` named in `.env.example`.
- Daniel-only: deploy with the real `ALLOWED_ORIGINS` secret and make one live hosted call.

## E2 — Real-stack CI — DONE locally (branch `fix/e2-real-stack-ci` @ `13534c9`, no PR)

- Port 54321 → 54331 with a fail-closed CI pin; `real-stack` job starts Supabase, resets the DB,
  builds and runs the walkthrough.
- Local exact acceptance: start exit 0, db reset 40 migrations, build exit 0,
  `npm run e2e:full` **3 passed**. Stale selectors were corrected with exact-text replacements;
  no assertion, timeout or test count was weakened. Docker-layer caching remains open.
- Evidence: `docs/evidence/E2-real-stack-ci.md`. No PR (two-slot cap), so `VERIFIED-IN-CI` withheld.

## E3 — De-flake — DONE locally; headroom NOT DONE (branch `fix/e3-defake-headroom` @ `2d226db`, no PR)

- GT-09: deterministic router injected through the existing `PipelineExecutor` seam into the one
  flaky quiz test; assertions and the 5 s timeout untouched. Exact acceptance: **20/20** full
  suites, 92 files / 515 tests each.
- GT-10 NOT DONE: `perf:login-route` 732,759 / 733,000 B (241 B, 0.03 %); a 5 % reduction needs
  ~36 KB of architectural split and no safe seam was found. No budget raised.
- Evidence: `docs/evidence/E3-defake-headroom.md`.

## E4 — Privacy surface — DONE locally (branch `fix/e4-privacy-surface` @ `440fb9d`, no PR)

- Real defect found on the live erasure path: it called `governedWrite` (an upsert). Fixed with
  `Database.governedDelete(table)` scoped by the authenticated user and the canonical owner
  column; `deleteUserData()` now reports per-table failures and an audit id, and clears local
  state only on full success. Append-only audit trails are explicitly retained (not misclaimed).
- Consent/export/confirmed-delete wired into the real `/settings` route. Eight new tests proven
  red then green; full suite 94 files / 523 tests; login budget 732,862 / 733,000 B PASS.
- Evidence: `docs/evidence/E4-privacy-surface.md`. Daniel-only: legal wording review.

## E5 — RLS matrix in CI — DONE locally (branch `fix/e5-dependency-vulns` @ `99ac390`, no PR)

- `rows=247 pass=247 fail=0 blocked=0`; negative control `pass=70 fail=177` proves the gate is not
  vacuous. Fail-closed `rls-matrix` CI job added. Evidence: `docs/evidence/E5-rls-matrix-ci.md`.

## E6 — Dependency audit slice — DONE locally (branch `fix/e6-dependency-audit` @ `da82dd7`, no PR)

- Red 34 advisories (1 critical) → green 11 (0 critical) via semver-compatible repairs plus a
  non-major `zod` bump; semver-major Expo/router downgrades were rejected.
- `npm audit --omit=dev --audit-level=critical` added to CI; typecheck/lint/tests/build green
  after a full `npm ci`. Evidence: `docs/evidence/E6-dependency-audit.md`.
- Open: 11 advisories (5 high, 6 moderate) have no published fix without major upgrades.
  Daniel-only: alert destination and billing dashboard.

## E6 — Cost-model acceptance — DONE locally (branch `test/e6-cost-model-proof` @ `ac0162f`, no PR)

- E6's acceptance command `npm run test -- tests/flows/cost.model.test.ts` did not exist on main.
  The token-based cost was already implemented (`lib/ai/reliability.ts:284-302`), so this is a
  test-only change: 3 tests assert the exact hosted cost (0.00000071 USD for 3 in / 7 out tokens),
  zero cost for local inference, and zero cost for a validated cache fallback after a failed rail.
- Full gate: typecheck 0, lint 0 errors, 93 files / 518 tests, boundaries 0, build 0, login budget
  **732,759 / 733,000 B PASS** (unchanged — no production/bundle change).
- The first commit attempt was rejected by the pre-commit hook on the known quiz-test flake that
  lives on `origin/main`; it was retried without raising the timeout or weakening the test.
- Evidence: `docs/evidence/E6-cost-model.md`, `sprints/sprint_42_e6_cost_model.md`.

## E6 — Governance routing — ATTEMPTED, NOT SHIPPED

- Branch `fix/e6-governance` was reset to `origin/main`; the experiment is preserved at
  `/tmp/work/e6-governance-experiment.patch`.
- Achieved locally: governance audit **0 WARN**, typecheck/lint 0 errors, 92 files / 515 tests,
  boundaries PASS. But the cross-cutting imports pushed E3's login-route budget to
  **733,082 / 733,000 B (FAIL)**. Because raising that budget or weakening E3's gate is forbidden,
  the slice was not committed or pushed.
- Still open: error-rate/uptime alerting (Daniel-only destination), and a single branch that
  carries all three E6 acceptance commands together (merging is not an allowed remote action).
  E6 is therefore **PARTIAL**.

## Closure layer — verified rows (this branch, `feat/readiness-register`)

- Brought up the real local Supabase stack on E2's pinned ports (API `:54331`, mail `:54325`),
  applied 40 migrations, ran `npm run test:auth-flow` **4/4 green**; restored `supabase/config.toml`.
- Added `tests/mastery.unified.test.ts` (2 tests: governed DB read + ownership-stamped upsert),
  proven red with the write disabled and green after restore; `tests/domain/prerequisites.test.ts`
  (5 tests). Corrected C25's stale acceptance path to the existing, passing
  `tests/flows/roadmap.persistence.test.ts` (3 tests).
- Advanced C01, C02, C18, C19, C25 to `VERIFIED-LOCAL` on that executed proof only. PILOT
  16.1 → **17.7 %** (open P0 30 → 27); V1-POLYMATH 12.4 → **14.4 %** (open P0 12 → 11);
  V1-ACADEMIC and WORLD-CLASS unchanged. No milestone READY; ≥80 % not claimed.
- Deliberately NOT flipped: C03/C04 (auth suite does not render the setup wizard), C11
  (`check:ai-boundary` does not test proxy auth/daily cap), C22/E10-T1 (one projection test cannot
  prove "all screens"). C12/C45/C49 remain structurally/credential blocked.
- Gates: typecheck 0, lint 0 errors / 148 warnings, **95 files / 531 tests**, boundaries 0,
  AI boundary PASS, readiness check 0, build 0, login **732,759 / 733,000 B PASS**.
- Evidence: `docs/evidence/closure-verified-rows.md`, `sprints/sprint_43_closure_verified_rows.md`.

## PR cap

Only #19 (R0) and #20 (E1) are open. E2/E3/E4/E5/E6 branches were pushed with local proof only;
CI cannot run on a bare branch push under the allowed remote actions. No merge, tag, force-push,
deploy or dashboard action was performed. No secret was printed or committed.
