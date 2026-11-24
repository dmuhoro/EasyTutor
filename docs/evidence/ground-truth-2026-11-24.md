# EasyTutor — Ground Truth Audit (2026-11-24)

Branch `audit/ground-truth-2026-11-24` from `origin/main` @ `4a34ceb` (tag `v1.16.0`).
Every statement below is backed by a command run this session. Where a check could not run,
it is marked **NOT RUN** with the reason. Claims from STATUS.md / CHANGELOG / sprint docs are
treated as CLAIMS and only repeated where a command confirmed them.

Probe logs: `/tmp/audit/` (`typecheck.log`, `lint.log`, `test-parallel.log`, `test-serial-1..3.log`,
`insuite-*.log`, `rls-matrix.log`, `db-reset.log`, `build.log`, `perf-*.log`, `e2e-smoke.log`,
`audit-prod.json`, `secretscan.log`, `login-390.png`).

---

## 0. Verdict

**The engineering core is real and green; the product is not yet the product the FINAL STATE
describes.** On a clean clone at `4a34ceb`, every local gate passes: typecheck 0 errors, lint 0
errors, **92 test files / 515 tests**, boundaries 0 violations, all five guards, QA runner,
web export, both JS budgets, and a 9/9 Playwright smoke. The RLS matrix genuinely proves
**247/247 cases across 34 tables**, and all 40 migrations apply from zero. That is a materially
stronger base than the earlier reports implied.

But three classes of gap are load-bearing and were verified, not guessed:

1. **The academic product (F3) does not exist at runtime.** Curriculum packs are a registry
   with **zero consumers**, backed by Node `fs` (unusable on a device), with one thin pack.
   There is no mock-exam mode (a 60-second per-question timer is not an exam), and the exam
   date captured at setup is **never displayed**.
2. **The polymathic canonical state (F2) is not unified.** `projectCanonicalLearnerState` is
   consumed only by the Mathematics journey. Home and You read `useProgressStore` /
   `useRoadmapStore` directly, and there are **two disconnected mastery systems**.
3. **Trust and reach are incomplete.** The hosted AI proxy has **no CORS handling**, so the
   web build cannot call it; consent / export / delete are implemented but wired to **no UI**;
   i18n covers **9 of 40** screens; and the real-stack e2e harness is **not reproducible from
   the repo** because it asserts port `:54331` while `config.toml` binds `:54321`.

Add a confirmed **1-in-20 in-suite test flake**, a login-route budget with **241 bytes** of
headroom, **34 production dependency vulnerabilities**, and a free-tier AI capacity of roughly
**10–15 learners**, and the honest position is: *pilot-ready on Android after a short, specific
list — not V1.*

---

## 1. CI truth

| Fact | Verified value |
|---|---|
| HEAD / origin/main | `4a34ceb` (identical) |
| Version | `1.16.0`, tag `v1.16.0` |
| Open PRs | **0** (PRs #3–#17 all merged) |
| Workflows | **1** — `.github/workflows/ci.yml` |
| Jobs | **1** — `build`; status-check name **`build`** |
| Last 12 runs on main | **12 / 12 success** (2026-11-19 → 2026-11-24) |
| Last 31 runs on main | 19 success / **12 failure** |
| Newest failure | `44050144294` @ `cae99d9` (2026-11-17): `typecheck` → `TS2307 Cannot find module '@axe-core/playwright'`, `TS7006 implicit any` |
| Supabase CLI job | **NONE** |
| e2e (`e2e:full`) job | **NONE** |
| auth-flow integration job | **NONE** |
| governance audit in CI | **NO** (only in local `qa_runner.js`) |
| npm audit in CI | **NONE** |

CI step order: `check:imports` → `check:ai-boundary` → `typecheck` → `lint` → `test` →
`lint:cycles` → `validate_boundaries.js` → `guard:secret-exposure` → `guard:public-env` →
`qa_runner.js` → playwright chromium → `build` → `guard:dist` → `perf:budget` →
`perf:login-route` → `e2e:smoke`.

**Prompt premise correction:** the brief says main includes "PRs #3–#6 … tests 484 in 84 files".
Main is 11 PRs and a release past that; tests are **515 in 92 files**.

---

## 2. Gates from a clean clone

Clone `/tmp/audit/clean` @ `4a34ceb`, `npm ci` exit 0. Memory: 1.2 GiB free at start (an active
Android Gradle build was running and was **not** killed), 2.3 GiB later; all heavy gates ran
serially.

| Gate | Result | Detail |
|---|---|---|
| `npm run typecheck` | **PASS** | 16.2 s, 653 MB peak |
| `npm run lint` | **PASS** | 0 errors / **150 warnings** (clean clone); the repo's own pre-commit hook reported **148** on the working tree — count varies with resolved files, errors are 0 either way; 12.8 s |
| `npm test` (parallel) | **PASS** | **92 files / 515 tests**, 32.5 s |
| `npm test` serial ×3 | **PASS** | 92/515 each |
| `quiz.wrongAnswers` solo ×20 | **20/20 PASS** | 221–285 ms each |
| full suite ×20 (flake probe) | **19/20 PASS** | run 15 failed (below) |
| `check:imports` | PASS | 423 files |
| `check:ai-boundary` | PASS | no disabled direct rail |
| `lint:cycles` | PASS | 0 errors, 12 warnings |
| `guard:secret-exposure` | PASS | 449 files |
| `guard:public-env` | PASS | 2 `EXPO_PUBLIC_*` names |
| `validate_boundaries.js` | PASS | 0 violations |
| `governance_audit.js` | PASS + 2 WARN | raw Supabase: `lib/recommendations.ts:401`, `lib/trendEngine.ts:219,250` |
| `qa_runner.js` | PASS | no timeout configured |
| `npm run build` | **PASS** | 110.5 s, 1.68 GB peak |
| `guard:dist` | PASS | 494 files |
| `perf:budget` | PASS | gzip 437,683 / 450,000 B |
| `perf:login-route` | PASS | 732,759 / 733,000 B |
| `e2e:smoke` | **PASS** | 9/9, 1.1 min |
| `supabase db reset` | **PASS** | **40 migrations** applied, exit 0 |
| RLS matrix (`run_rls_matrix_local.sh`) | **PASS** | **247/247 rows, 34 tables, 0 fail** |

### 2.1 Flake register

| Test | Runs | Failures | Cause |
|---|---|---|---|
| `tests/flows/quiz.wrongAnswers.test.ts` › `generates structured single question…` | 20 solo + 20 in-suite | **1** (in-suite run 15) | **`Error: Test timed out in 5000ms`** |

Root cause, evidenced: the test takes 221–285 ms solo but 5035 ms under a 4-worker suite on a
memory-pressured box. There is no artificial delay in `pipelineExecutor.ts`; the cost is the
cold module graph plus CPU starvation against vitest's default 5000 ms budget. The earlier
`expected 0 >= 2` CI failure was a *different* cause (real retrieval path / Ollama reachability)
already fixed by stubbing `lib/retrieval`.

**Verdict: the test is the cause, not product logic.** Correct fix is to remove the cold-load
(warm the port in setup, or stub the executor's port) — **not** to raise the 5 s budget.
CI is currently green 12/12, so this is latent, not red.

### 2.2 Budget headroom (ratchet risk)

| Budget | Used | Limit | Headroom |
|---|---|---|---|
| Entry gzip | 437,683 B | 450,000 B | 12,317 B (2.7 %) |
| Entry raw | 1,673,906 B | 1,750,000 B | 76,094 B (4.3 %) |
| **Login route transferred** | **732,759 B** | **733,000 B** | **241 B (0.03 %)** |

A single dependency bump breaks CI. This is a P1 engineering-health defect, not a pass.

---

## 3. Capability matrix (F1–F8)

Status vocabulary: **VERIFIED-IN-CI** (a CI step exercises it) · **VERIFIED-LOCAL** (a command
run this session proves it) · **IMPLEMENTED-UNPROVEN** (code exists, no executed proof) ·
**PARTIAL** · **MISSING**.

| # | Capability | Status | Evidence | Next proof |
|---|---|---|---|---|
| 1 | Identity / sign-in | IMPLEMENTED-UNPROVEN | `app/(auth)/login.tsx`; `store/authStore.ts`; local GoTrue up | Run `test:auth-flow` against a pinned local stack |
| 2 | Email confirm | IMPLEMENTED-UNPROVEN | `check-your-email` design; Mailpit at 54324 | Confirm round-trip in e2e |
| 3 | Onboarding | IMPLEMENTED-UNPROVEN | `screens/onboarding.tsx:61` → setup-wizard | e2e signup→setup |
| 4 | Setup wizard | IMPLEMENTED-UNPROVEN | `screens/setup-wizard/index.tsx` (7 steps) | e2e completion |
| 5 | Import own notes/books | PARTIAL | `lib/chunking.ts`, `lib/library.ts`; FTS migration `20261117_private_import_fts.sql` | e2e import → chunk count |
| 6 | Chunking | VERIFIED-LOCAL | `tests/chunking/semanticChunker.test.ts` | — |
| 7 | Embeddings (optional) | PARTIAL | `lib/embeddings.ts` returns `null` fail-closed; Ollama-only | Prove FTS-only path end-to-end |
| 8 | Governed retrieval | VERIFIED-LOCAL | `lib/retrieval.ts`; `tests/intelligence/retrieval.test.ts`; RLS `knowledge_chunks` PASS | e2e cited answer |
| 9 | Exact-marker citations | VERIFIED-LOCAL | `lib/citations.ts:12-17`; `tests/screens/study-citations.test.ts` | e2e source sheet |
| 10 | Single provider selector | VERIFIED-LOCAL | `lib/ai/providerSelection.ts`; `tests/flows/orchestration.contract.test.ts` | — |
| 11 | Hosted proxy (auth, caps) | IMPLEMENTED-UNPROVEN | `supabase/functions/ai-proxy/index.ts` (JWT, 200/day, 16 KB, 1000 tok) | Deploy + live call |
| 12 | Proxy CORS for web | **MISSING** | no `OPTIONS` handler; non-POST → 405 (`index.ts:34`) | Add preflight, prove browser call |
| 13 | Socratic tutoring | PARTIAL | `src/domain/learning/socratic.ts` (constants only); prompt builder test | Prove multi-turn strategy |
| 14 | Quiz generation | VERIFIED-LOCAL (flaky) | `tests/flows/quiz.*`; 1/20 timeout | De-flake |
| 15 | Worked solutions | PARTIAL | `explanation` field only; no worked-solution renderer | Add + test renderer |
| 16 | Diagrams | **MISSING** | 0 renderer; 5 incidental `svg` refs | Add diagram primitive |
| 17 | Mastery (domain, deterministic) | VERIFIED-LOCAL | `src/domain/learning/mastery.ts`; `mathFullChain.m1.test.ts` | Generalise past math |
| 18 | Mastery (DB) | IMPLEMENTED-UNPROVEN | `lib/mastery.ts` (governed) | Prove write→read |
| 19 | Prerequisites | IMPLEMENTED-UNPROVEN | `src/domain/learning/prerequisites.ts`; used in `knowledgeGraphEngine.ts` | Wire to recommendation |
| 20 | Spaced repetition | **MISSING in UI** | `lib/spacedRepetitionEngine.ts`; **0 UI imports** | Wire + test |
| 21 | Recommendations | PARTIAL | `lib/recommendations.ts`; only `screens/shared/momentum.tsx` | Surface on Home |
| 22 | Canonical learner state | PARTIAL | `projectCanonicalLearnerState` used **only** by `store/mathJourneyStore.ts` | Feed Home + You |
| 23 | Weak spots | PARTIAL | `wrongAnswers` store; `getWeakTopics` | Prove weak-spot review |
| 24 | Multi-subject generality | PARTIAL | Math proven; physics only in fixtures | Prove second subject |
| 25 | Roadmaps | IMPLEMENTED-UNPROVEN | `store/roadmapStore.ts`; `screens/roadmaps/*` | e2e create→persist |
| 26 | Curriculum packs | **MISSING at runtime** | `lib/curriculum/registry.ts` has **0 consumers**, uses Node `fs`; 1 pack, 0 topics | Make packs device-loadable |
| 27 | Mock exam + marking | **MISSING** | only a 60 s per-question timer (`screens/tabs/quiz.tsx:163`) | Build exam mode |
| 28 | Exam countdown | **MISSING** | `examDate` captured, never rendered; `screens/tabs/index.tsx:60` says not reproduced | Render + test |
| 29 | Offline + sync | PARTIAL | `services/syncEngine.ts`; `useNetInfo`; queue | e2e offline mid-question |
| 30 | i18n en/sw/fr | PARTIAL | `src/locales/*` + gate test; **9/40** screens use `t()` | Localise remaining screens |
| 31 | A11y WCAG 2.2 AA | IMPLEMENTED-UNPROVEN | `tests/e2e/axe-a11y.test.ts` **excluded from CI** | Run axe authenticated in CI |
| 32 | Low-data mode | PARTIAL | `lib/useConnectionStatus.ts` | Prove behaviour |
| 33 | PWA | VERIFIED-LOCAL | `e2e:smoke` 9/9; manifest + SW served | — |
| 34 | Native Android build | **UNVERIFIED** | `android/` present; no APK newer than 2026-11-20 | Produce + install APK |
| 35 | Stitch screens wired | PARTIAL | 33/35 mapped; FR/SW designs not localised | Localise + screenshot |
| 36 | Tokens only | PARTIAL | **953 raw hex in 48 files**; manifest-covered screens 30/33 clean | Migrate remaining |
| 37 | Empty / error states | PARTIAL | `RouteFallback`, `GlobalErrorBoundary`, connection-error design | Screenshot each |
| 38 | Perf budgets | VERIFIED-LOCAL | `perf:budget`, `perf:login-route` PASS | Widen headroom |
| 39 | Consent | **MISSING in UI** | `lib/privacy/consent.ts`; **0 UI imports** | Wire to settings |
| 40 | Data export | **MISSING in UI** | `lib/privacy/dataExport.ts`; 0 imports | Wire + test |
| 41 | Delete account | **MISSING in UI** | `lib/privacy/dataDeletion.ts`; 0 imports | Wire + test |
| 42 | Rate limiting | IMPLEMENTED-UNPROVEN | proxy `DAILY_LIMIT=200`; atomic RPC | Prove 429 live |
| 43 | Cost control | **MISSING** | `estimatedCostUsd` hard-coded `0` | Real cost model |
| 44 | Monitoring | PARTIAL | `logEvent`/`analytics` offline queue; no APM/alerting | Add error + uptime alerts |
| 45 | Staging | **BLOCKED** | STATUS.md §Blocked; no CI Supabase | Provision + verify |
| 46 | Migrations from zero | **VERIFIED-LOCAL** | `db reset` 40 migrations, exit 0 | Add to CI |
| 47 | RLS two-user, all tables | **VERIFIED-LOCAL** | 247/247, 34 tables | Add to CI |
| 48 | Secrets not client-side | VERIFIED-LOCAL | guard 449/494 files; scan 0 real secrets | — |
| 49 | CI proves full journey | **MISSING** | no Supabase job; `e2e:full` not reproducible | Build CI e2e |

Totals: VERIFIED (CI or local) **12**, IMPLEMENTED-UNPROVEN **13**, PARTIAL **16**,
MISSING **8**.

---

## 4. User-journey proof (Section D)

| Journey | Result | Basis |
|---|---|---|
| Unauthenticated route load, deep links, PWA | **PASS** | `e2e:smoke` 9/9, `/tmp/audit/e2e-smoke.log` |
| `/login` at 390 px renders | **PASS** | `/tmp/audit/login-390.png` (780×1688 @2×) |
| Import → cited answer → source sheet | **NOT RUN** | needs local stack + seeded auth |
| Quiz → worked solution → weak-spot review | **NOT RUN** | same |
| Math journey reachable from tabs | **NOT RUN** | code path is `tabs/roadmap → /explore → /math-journey`; not exercised |
| Offline mid-question, reload | **NOT RUN** | same |
| Two accounts isolated in UI | **NOT RUN** | RLS proven at DB layer only |
| `e2e:full` (real local Supabase + stub LLM) | **NOT RUN — not reproducible** | spec asserts `:54331`; `config.toml` binds `:54321`; no committed override; editing config is a source change |

Honest statement: **the full learner loop is not proven end-to-end this session.** The DB layer
underneath it is proven; the UI journey is not.

---

## 5. Security and privacy (Section E)

| Check | Result |
|---|---|
| Secret scan, working tree (909 tracked files) | 1 hit = **false positive** in a vendored Supabase dashboard JS blob (`sk-` + 32 chars in minified string) |
| Secret scan, last 100 commits | **0 hits** |
| Exported bundle scan (`guard:dist`) | **PASS**, 494 files |
| `EXPO_PUBLIC_*` names | only `SUPABASE_URL`, `SUPABASE_ANON_KEY` (allowlisted) |
| RLS enabled | **33 / 33 tables** |
| RLS matrix | **247/247, 34 tables** (`profiles`, `user_progress`, … `cached_responses`) |
| RLS in CI | **NO** |
| ai-proxy auth | JWT required, validated via `/auth/v1/user` |
| ai-proxy fail-closed | 401/400/413/429/502 paths all explicit |
| ai-proxy key echo | never returns upstream body or key |
| ai-proxy model list | allowlist of 2, mirrored in `src/config/registry.ts` |
| ai-proxy CORS | **ABSENT** — blocks browser callers |
| npm audit (production) | **34** (2 low, 13 moderate, 18 high, **1 critical**) |
| Critical package | `shell-quote` (transitive, tooling) |
| Direct high | `zod <4.6.6`, `postcss`, `expo-router` (via `query-string`) |
| Consent / export / delete | implemented, **0 UI imports** |
| Copyright posture | user chunks relabelled private (`20260913_relabel_user_chunks_private.sql`); no licence/attribution UI |

Note: `docs/design/stitch/README.md` records that the Stitch API key was pasted into a chat and
must be rotated. Not in git; rotation is Daniel's action.

---

## 6. Performance (Section F)

Reused and re-verified the parts that are command-backed; did **not** re-run Lighthouse mobile
(no mobile preset exists in `scripts/perf/lighthouse_desktop.mjs`, and the 7 GB box was under
load).

| Metric | Value | Basis |
|---|---|---|
| Login-route JS transferred | **732,759 B** | `perf:login-route` |
| Total JS (gzip) | 882.0 KB | `gzip -c` over `dist/**/*.js` |
| Entry chunk (gzip) | 429.2 KB | top module |
| Common chunk (gzip) | 302.8 KB | second module |
| Study chunk (gzip) | 51.2 KB | third module |
| Desktop Lighthouse | 89–92 `/`, 91–92 `/login` | STATUS.md (CLAIM, Sprint 33) |
| **Mobile Lighthouse** | **45–46, NOT MET** | STATUS.md (CLAIM) — **no gate exists** |
| Mobile TTI median-of-3 | **NOT RUN** | no mobile harness |

Top 15 modules by gzip bytes: entry 429.2, common 302.8, study 51.2, math-journey 8.0,
index 6.8, quiz 5.8, learning-dashboard 4.9, index 4.2, index 4.0, fr 3.9, index 3.8,
session 3.8, library 3.7, index 3.6, sw 3.6 KB.

Ratchet headroom is the real risk: **241 B** on login, 2.7 % on entry.

---

## 7. Stitch / UI coverage (Section G)

Method (documented, single method): each manifest `slug` is mapped explicitly to its
implementation file under `screens/` (route files in `app/` are thin `lazy()` loaders and were
**not** counted — counting them produced false zeros). Hex = regex `#[0-9a-fA-F]{3,8}\b`;
strings = literal `t('…')` calls.

| Metric | Value |
|---|---|
| Screens in manifest | **35** |
| Mapped to an implementation | **33** (login/check-email have no `screens/` file) |
| Implementations with **0 raw hex** | **30 / 33** |
| Implementations with **0 `t()`** | **13 / 33** |
| Implementations importing real data/services | **32 / 33** |
| French/Swahili designs localised in app | **0 / 4** — they map to English `screens/tabs/*` |

App-wide token debt: **953 raw hex occurrences across 48 files** (top: `learning-dashboard.tsx`
93, `ai_literacy/index.tsx` 78, `setup-wizard/index.tsx` 61, `self_directed/index.tsx` 42).
i18n coverage: **9 of 40** screen implementations use `t()`.

390 px screenshots vs reference: only `/login` captured (`/tmp/audit/login-390.png`). The other
34 are **NOT RUN** — they need seeded auth on the `:54331` stack.

---

## 8. Cost and capacity (Section H)

Assumptions (marked): proxy cap **200 calls/user/day**, **≤1000 output tokens/call**, 2 Groq
models. Groq free-tier numbers are **UNVERIFIED** and only Daniel can confirm them in the
console.

| Item | Value |
|---|---|
| AI calls per active learner/day (assumed) | 20–50 (cap 200) |
| Tokens per call (assumed) | 600–900 |
| Tokens per learner/day (assumed) | 12k–45k |
| Groq free TPD (assumed 500k) | **≈11–40 learners** |
| Groq free RPM/TPM (assumed 30 / 6k) | burst-limited well below that |
| Supabase free | 500 MB DB, 2 GB egress — fine for ~100 light learners |
| Vercel free | 100 GB egress — fine at this scale |

**Capacity verdict: the free tiers do not support 100 learners with AI on.** The 200/day cap is
a good safety rail but the token-per-day ceiling is the binding constraint. Only Daniel can
check: actual Groq tier, actual Supabase/Vercel plan, and real token usage per feature.

`estimatedCostUsd` is hard-coded to `0` in `lib/ai/reliability.ts`, so there is **no cost
telemetry** to validate any of this.

---

## 9. Docs truth (Section I)

STATUS.md is unusually honest — it records mobile Lighthouse NOT MET, live proof BLOCKED, and
the flake. The defects are numeric drift and one agent-facing file:

| File:line | Claim | Reality |
|---|---|---|
| `AGENTS.md:28` | "39 files / 174 tests current" | **92 files / 515 tests** — badly stale, and it is the file every agent reads |
| `STATUS.md:61` | "all 46 migrations apply cleanly" | **40** migration files apply (`run-all.sql` skipped) |
| `STATUS.md:42` | "148 warnings", "source guard 450", "bundle guard 495" | **150 warnings**, 449, 494 |
| `README.md:136` | "104/104 RLS" | matrix now reports **247/247** (superset; not wrong, but stale) |
| `README.md:65` | governed layer for sync | `lib/trendEngine.ts` and `lib/recommendations.ts` still call `supabase.from` directly |
| `docs/design/stitch/README.md` | Stitch key "exposed" | still requires rotation (Daniel-only) |

CHANGELOG is consistent with tags and versions; no contradiction found.

---

## 10. Backlog harvest (Section J)

| Item | Count / detail |
|---|---|
| TODO / FIXME / HACK / XXX | **4** in live source |
| Skipped / todo tests | **1** (`describe.skipIf` on `evidenceRls.integration.test.ts`, skipped without env) |
| Unrouted screens | `screens/setup/index.tsx`, `screens/library/index.tsx`, `screens/progress/index.tsx` (route shadowed) — confirm before deleting |
| `archive/` imports from live code | **0** |
| Unused direct dependencies | **4**: `expo-updates`, `expo-dev-client`, `react-native-worklets`, `@expo/ngrok` |
| Lint warnings | **150**, dominated by `no-unused-vars` and unused eslint-disable directives |
| Stray files at root | `Anthropic` (4.6 MB), `2026-09-13 13:47:10` (0 B), `.tmp-analytics-scripts/`, `docs/security/…Supabase_files/` (896 KB vendored dashboard) |
| Dependency cycles | 12 warnings (`lint:cycles`) |

---

## 11. DEFECT REGISTER

Severity: **P0** blocks a classmate from finishing · **P1** breaks a feature · **P2** polish.
Fix size: S / M / L.

| ID | Sev | Defect | Evidence | Root cause | Size |
|---|---|---|---|---|---|
| GT-01 | P0 | Web/PWA cannot call hosted AI — no CORS on ai-proxy | `supabase/functions/ai-proxy/index.ts:34` (non-POST → 405, no `Access-Control-Allow-Origin`) | OPTIONS never handled | S |
| GT-02 | P0 | Curriculum packs never loaded; loader is Node-`fs` only | `lib/curriculum/registry.ts` 0 consumers; 1 pack, 0 topics | Built for tests, not runtime | M |
| GT-03 | P0 | No mock-exam mode or marking | only 60 s per-question timer `screens/tabs/quiz.tsx:163` | never built | L |
| GT-04 | P0 | Exam countdown never shown | `examDate` captured `setup-wizard:156`, 0 renders | never wired | S |
| GT-05 | P1 | Canonical learner state feeds only Math | `store/mathJourneyStore.ts:20` sole consumer | Home/You predate the projection | L |
| GT-06 | P1 | Two disconnected mastery systems | `src/domain/learning/mastery.ts` vs `lib/mastery.ts` | parallel implementations | M |
| GT-07 | P1 | Consent / export / delete wired to no UI | 0 imports of `lib/privacy/*` | never surfaced | M |
| GT-08 | P1 | `e2e:full` not reproducible; no CI e2e | spec asserts `:54331`, `config.toml` binds `:54321` | one-off local setup not committed | M |
| GT-09 | P1 | Confirmed test flake 1/20 | `insuite-FAIL-15.log` 5000 ms timeout | cold-load vs fixed budget | S |
| GT-10 | P1 | Login-route budget has 241 B headroom | `perf:login-route` 732,759/733,000 | budget set to observed value | S |
| GT-11 | P1 | RLS proof not in CI | `rls_matrix_rest.mjs` unreferenced by workflow | proof is manual | S |
| GT-12 | P1 | 34 production vulnerabilities (1 critical) | `npm audit --omit=dev` | stale pins | M |
| GT-13 | P1 | Governance bypass in `trendEngine`/`recommendations` | direct `supabase.from` | pre-ADR-006 code | M |
| GT-14 | P1 | Spaced repetition not surfaced | engine + tests, 0 UI imports | never wired | M |
| GT-15 | P1 | i18n covers 9/40 screens | `t()` census | partial migration | L |
| GT-16 | P1 | A11y axe suite excluded from CI | `vitest.config.js` excludes `axe-a11y.test.ts` | kept out to stay green | S |
| GT-17 | P1 | Cost telemetry always 0 | `estimatedCostUsd: 0` | placeholder | S |
| GT-18 | P1 | Free-tier AI supports ~11–40 learners, not 100 | capacity math §8 | token ceiling | M |
| GT-19 | P2 | 953 raw hex across 48 files | hex census | tokens not adopted everywhere | L |
| GT-20 | P2 | 4 unused deps; stray root files | depcheck + `ls` | housekeeping | S |
| GT-21 | P2 | AGENTS.md test count stale (174 vs 515) | `AGENTS.md:28` | not maintained | S |
| GT-22 | P2 | No diagrams for diagram-needing subjects | 0 renderer | never built | L |
| GT-23 | P2 | Native APK unverified | no APK after 2026-11-20 | build not run to completion | M |
| GT-24 | P2 | Mobile Lighthouse NOT MET (45–46) and ungated | STATUS.md | no mobile harness | M |

---

## 12. Risks

1. **False confidence from green CI.** CI is green, but it exercises none of the product's
   real stack. A regression in RLS, migrations, or the learner loop ships silently.
2. **Budget ratchet.** 241 B of headroom means the next dependency bump fails CI for an
   unrelated reason and tempts a threshold raise.
3. **Duplicate domain logic.** Two mastery systems and two learner-state sources will diverge;
   Home will show numbers the Math journey disagrees with.
4. **AI capacity.** A pilot of 100 learners will exhaust the assumed free tier within days.
5. **Single-maintainer bus factor.** Every live proof in STATUS.md is blocked on Daniel's
   credentials.

---

## 13. UNVERIFIABLE (only Daniel can check)

1. Whether `ai-proxy` is actually deployed and answers a live Groq call.
2. Cloud Supabase project state, staging, and Auth URL settings.
3. Actual Groq tier and token/day limit; actual Supabase/Vercel plans and billing.
4. Google OAuth round-trip.
5. Real-device install and the full learner loop on Android.
6. Vercel production Lighthouse (protection + CDN behaviour).
7. Rotation of the Stitch API key recorded as exposed.
8. Whether the vendored Supabase dashboard blob under `docs/security/` may be deleted.
