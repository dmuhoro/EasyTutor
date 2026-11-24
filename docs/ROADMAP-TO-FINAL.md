# ROADMAP TO FINAL — EasyTutor

Derived from `docs/evidence/ground-truth-2026-11-24.md` (branch `audit/ground-truth-2026-11-24`).
Every acceptance criterion is a command that exits 0 and can run in CI. Nothing here raises a
budget, timeout, or threshold; where a gate is tight, the fix is to widen the product margin,
not the limit.

Milestones: **PILOT** (10–25 real learners, one subject, Android + web) → **V1-ACADEMIC**
(F3 complete) → **V1-POLYMATH** (F2 complete) → **WORLD-CLASS** (F6/F7 at scale).

---

## (i) Critical path

```
E1 (CORS) ─┐
E2 (CI real stack) ─┼─→ E4 (privacy UI) ─→ E6 (monitoring/cost) ─→ PILOT
E3 (de-flake + headroom) ─┤
E5 (RLS in CI) ───────────┘
                                   PILOT ─→ E7 (packs runtime) ─→ E8 (mock exam) ─→ E9 (countdown) ─→ V1-ACADEMIC
                                   V1-ACADEMIC ─→ E10 (canonical state) ─→ E11 (mastery unify) ─→ E12 (2nd subject) ─→ V1-POLYMATH
                                   V1-POLYMATH ─→ E13 (i18n) ─→ E14 (tokens) ─→ E15 (a11y+perf) ─→ E16 (scale) ─→ WORLD-CLASS
```

**PILOT cannot start without E1, E2, E4.** A web learner with no AI answer is not a pilot.

---

## (ii) Parallel lanes (non-overlapping file ownership)

Two agents can run concurrently in separate worktrees/branches. Ownership is by path so
merges cannot collide.

| Lane | Owns | Epics |
|---|---|---|
| **Lane A — Edge & CI** | `supabase/functions/**`, `.github/workflows/**`, `scripts/security/**`, `scripts/qa/**` | E1, E2, E5, E6 |
| **Lane B — Product UI** | `screens/**`, `app/**`, `components/**` | E4, E7(UI), E8, E9, E13 |
| **Lane C — Domain** | `src/domain/**`, `src/intelligence/**`, `lib/**`, `store/**` | E3, E7(loader), E10, E11, E12, E14 |
| **Lane D — Quality** | `tests/**`, `scripts/perf/**`, `docs/evidence/**` | E15 |

Rule: a lane never edits another lane's paths in the same PR. Shared files
(`package.json`, `vitest.config.js`, `src/config/registry.ts`) are changed only by the lane that
owns the epic, with the other lane rebasing.

---

## (iii) Which epics can run on free-tier agents

- **Free-tier safe:** E3, E5, E9, E10, E11, E13, E14, E16 (docs) — pure code, local tests.
- **Needs a paid/heavier runner:** E2, E7, E8, E12, E15 — Docker/Supabase, browsers, Lighthouse.
- **Daniel-only (cannot be delegated):** live Groq call, cloud Supabase/staging, OAuth,
  real device, Vercel production, Stitch key rotation, billing.

---

## (iv) What moves into CI (so the 7 GB laptop stops being the bottleneck)

| Today (local only) | Moves to CI | Epic |
|---|---|---|
| `supabase db reset` | `supabase start` + `db reset` job | E2 |
| `rls_matrix_rest.mjs` | RLS matrix job | E5 |
| `e2e:full` | Playwright job on the real stack | E2 |
| `governance_audit.js` | CI step | E6 |
| `axe-a11y.test.ts` | authenticated axe job | E15 |
| Lighthouse desktop/mobile | scheduled perf job (not per-push) | E15 |
| `npm audit --omit=dev` | CI step with a fail-closed severity floor | E6 |

---

## (v) STOP DOING

1. **Stop writing status claims that no command produced.** Every row in STATUS.md must cite a
   command run in that session.
2. **Stop adding screens that no route reaches** (`screens/setup`, `screens/library`,
   `screens/progress` are shadowed — confirm and either route or archive).
3. **Stop treating a green `npm test` as product proof.** It is hermetic by design and excludes
   the real stack.
4. **Stop raising budgets to go green.** Fix the margin.
5. **Stop building a second copy of domain logic.** One mastery system, one learner state.
6. **Stop shipping English-only screens.** New screens must use `t()` from day one.
7. **Stop hard-coding `#hex` in new screens.** Tokens only.
8. **Stop manual local-stack setup.** If a proof needs a port, commit the config.

---

## Epics

### E1 — CORS on ai-proxy  ·  P0  ·  Size S (1 session)  ·  Lane A  ·  no deps
**Goal:** the web/PWA build can call the hosted proxy.
**Why:** GT-01 — without `OPTIONS`, every browser AI call fails preflight; native works, web
does not, so "hosted-proxy-first" is false on the web.
**Entry:** branch from main; local stack available.
**Scope:** `supabase/functions/ai-proxy/index.ts` — handle `OPTIONS`, add
`Access-Control-Allow-Origin` limited to an allowlist env var, `-Headers: authorization,content-type`,
`-Methods: POST,OPTIONS`; return 204. Never wildcard in production.
**Tasks:** (1) add allowlist env `ALLOWED_ORIGINS`; (2) preflight handler; (3) unit test the
handler; (4) test that a disallowed origin is rejected.
**Acceptance:**
```
npm run test -- tests/flows/aiProxy.cors.test.ts     # exits 0
npm run check:ai-boundary                             # exits 0
```
plus a CI step asserting `OPTIONS /functions/v1/ai-proxy` returns 204 with the allowlisted origin.
**Daniel-only:** set `ALLOWED_ORIGINS` in the deployed project.

### E2 — Real-stack CI + reproducible e2e  ·  P0  ·  Size M (3)  ·  Lane A  ·  deps E1
**Goal:** CI proves the journey on Supabase CLI.
**Why:** GT-08, F5 — no CI job touches a real stack; `e2e:full` asserts `:54331` that the repo
never configures.
**Scope:** commit a `supabase/config.ci.toml` (or port overrides) binding `:54331`; add a
`real-stack` job: `supabase start`, `db reset`, `npm run build`, `npm run e2e:full`.
**Tasks:** pin ports; add job; cache Docker layers; upload Playwright traces on failure.
**Acceptance:**
```
supabase start -x studio,imgproxy && supabase db reset --no-seed   # exit 0
npm run build && npm run e2e:full                                   # exit 0
```
**Daniel-only:** none for CI; staging credentials for the staging variant.

### E3 — De-flake + budget headroom  ·  P1  ·  Size S (1)  ·  Lane C  ·  no deps
**Goal:** zero known flakes; real headroom on both budgets.
**Why:** GT-09 (1/20 timeout), GT-10 (241 B).
**Scope:** warm the learning port in `tests/setupTests.ts` or stub `PipelineExecutor`'s port so
the test is not cold; reduce login-route bytes (defer a module or split a chunk) — do **not**
raise 450,000 / 733,000 / 5000.
**Acceptance:**
```
for i in $(seq 1 20); do npm test || exit 1; done     # exits 0, 20/20
npm run perf:login-route                              # exits 0 with >= 5% headroom
```
**Daniel-only:** none.

### E4 — Privacy surface  ·  P1  ·  Size M (2)  ·  Lane B  ·  deps none
**Goal:** consent, export, delete reachable and tested.
**Why:** GT-07, F4.
**Scope:** settings screen sections calling `lib/privacy/{consent,dataExport,dataDeletion}`;
confirm dialogs; explicit audit record.
**Acceptance:**
```
npm run test -- tests/flows/privacy.surface.test.ts   # exits 0
npm run typecheck && npm run lint                     # exits 0
```
**Daniel-only:** legal wording review.

### E5 — RLS matrix in CI  ·  P1  ·  Size S (1)  ·  Lane A  ·  deps E2
**Goal:** 247/247 runs on every push.
**Why:** GT-11 — the strongest trust proof is manual.
**Scope:** add `run_rls_matrix_local.sh` as a CI job; fail closed.
**Acceptance:** `bash scripts/security/run_rls_matrix_local.sh` exits 0 in CI.
**Daniel-only:** none.

### E6 — Governance, audit, monitoring, cost  ·  P1  ·  Size M (3)  ·  Lane A  ·  deps E2
**Goal:** no ungoverned DB access; real cost + error signal.
**Why:** GT-13, GT-17, GT-24-adjacent; F7.
**Scope:** route `lib/trendEngine.ts` and `lib/recommendations.ts` through
`src/infrastructure/database`; replace `estimatedCostUsd: 0` with token-based cost; add a
fail-closed `npm audit --omit=dev --audit-level=critical`; add error-rate + uptime alerting.
**Acceptance:**
```
node scripts/architecture/governance_audit.js          # 0 WARN
npm audit --omit=dev --audit-level=critical            # exit 0
npm run test -- tests/flows/cost.model.test.ts         # exits 0
```
**Daniel-only:** alert destination, billing dashboard.

### E7 — Curriculum packs at runtime  ·  P0  ·  Size L (5)  ·  Lane C + B  ·  deps PILOT
**Goal:** Kenya TVET, KCSE and university-custom packs load on device with reviewed/draft status.
**Why:** GT-02 — F3's foundation does not exist at runtime.
**Scope:** replace `fs` loading with bundled JSON imports + Zod validation at build time;
`source_status` surfaced in UI; seed KCSE + one university pack.
**Acceptance:**
```
npm run test -- tests/lib/curriculum/runtime.test.ts   # exits 0
npm run build                                          # exits 0
```
plus a CI step asserting ≥3 valid packs and 0 validation errors.
**Daniel-only:** review each pack and flip `DRAFT → OFFICIAL`.

### E8 — Mock exam with marking  ·  P0  ·  Size L (6)  ·  Lane B  ·  deps E7
**Goal:** timed paper, submission, marking, review.
**Why:** GT-03.
**Scope:** exam session store, timer, paper assembly from a pack, deterministic marking,
per-question review with worked solutions.
**Acceptance:**
```
npm run test -- tests/flows/mockExam.test.ts           # exits 0
npm run e2e:full                                       # includes exam journey
```
**Daniel-only:** confirm marking scheme per subject.

### E9 — Exam countdown  ·  P0  ·  Size S (1)  ·  Lane B  ·  deps none
**Goal:** the date captured at setup is shown and drives urgency.
**Why:** GT-04.
**Scope:** read `examDate` from profile; render on Home; handle none/past.
**Acceptance:** `npm run test -- tests/screens/examCountdown.test.ts` exits 0.
**Daniel-only:** none.

### E10 — One canonical learner state  ·  P1  ·  Size L (5)  ·  Lane C  ·  deps PILOT
**Goal:** evidence → mastery → prerequisites → recommendation feeds Home and You.
**Why:** GT-05, F2.
**Scope:** `projectCanonicalLearnerState` becomes the single selector consumed by
`screens/tabs/index.tsx`, `screens/tabs/you.tsx`, and `screens/math-journey.tsx`.
**Acceptance:**
```
npm run test -- tests/domain/canonicalState.consumers.test.ts   # asserts all three consume it
npm run typecheck && npm run lint                               # exits 0
```
**Daniel-only:** none.

### E11 — One mastery system  ·  P1  ·  Size M (3)  ·  Lane C  ·  deps E10
**Goal:** delete the duplicate; one deterministic function.
**Why:** GT-06.
**Scope:** make `lib/mastery.ts` a persistence adapter over
`src/domain/learning/mastery.ts::evaluateMastery`.
**Acceptance:** `npm run test -- tests/mastery.unified.test.ts` exits 0; `grep -r evaluateMastery`
shows one implementation.
**Daniel-only:** none.

### E12 — Second subject proven  ·  P1  ·  Size M (3)  ·  Lane C  ·  deps E10
**Goal:** Mathematics + one more (Physics) through the same state machine.
**Why:** F2 "at least two subjects proven".
**Scope:** fixtures + journey test for Physics end-to-end.
**Acceptance:** `npm run test -- tests/flows/secondSubject.test.ts` exits 0.
**Daniel-only:** content review.

### E13 — i18n completion  ·  P1  ·  Size L (4)  ·  Lane B  ·  deps none
**Goal:** every routed screen uses `t()`; en/sw/fr complete.
**Why:** GT-15 — 9/40.
**Scope:** migrate the 31 remaining implementations; extend the locale gate to fail on any
screen with user-visible literals.
**Acceptance:**
```
npm run test -- tests/locales/keys.test.ts            # exits 0
npm run test -- tests/locales.coverage.test.ts        # 40/40 screens use t()
```
**Daniel-only:** Swahili/French review.

### E14 — Tokens only  ·  P2  ·  Size L (4)  ·  Lane C  ·  deps none
**Goal:** zero raw hex in routed screens.
**Why:** GT-19 — 953 across 48 files.
**Scope:** map each hex to a token; add a lint rule / CI check.
**Acceptance:** `node scripts/design/check-no-raw-hex.mjs` exits 0 (0 hits in `app/` + `screens/`).
**Daniel-only:** design approval for new tokens.

### E15 — A11y + mobile perf gates  ·  P1  ·  Size M (3)  ·  Lane D  ·  deps E2
**Goal:** zero serious/critical axe findings authenticated; mobile Lighthouse measured and gated.
**Why:** GT-16, GT-24.
**Scope:** authenticated axe run in CI; mobile preset in `lighthouse_desktop.mjs` (rename to
`lighthouse.mjs`); fail closed at the agreed mobile target.
**Acceptance:**
```
npm run test:e2e:a11y                                 # exits 0, 0 serious/critical
npm run perf:lighthouse -- --preset=mobile            # exits 0 at target
```
**Daniel-only:** approve the mobile target number.

### E16 — Scale to ~100 learners  ·  P1  ·  Size M (3)  ·  Lane A  ·  deps E6
**Goal:** cost/capacity model, rate limits, runbook.
**Why:** GT-18, F7.
**Scope:** per-feature token budget, provider tier upgrade plan, rate-limit tuning, runbook.
**Acceptance:** `node scripts/ops/capacity_model.mjs --learners 100` exits 0 within budget.
**Daniel-only:** provider plan, billing, runbook sign-off.

---

## Milestone gates

| Milestone | Required epics | Command set that must exit 0 |
|---|---|---|
| **PILOT** | E1, E2, E3, E4, E5, E6 | full CI + `e2e:full` + RLS matrix + privacy tests |
| **V1-ACADEMIC** | + E7, E8, E9 | + curriculum runtime + mockExam + countdown |
| **V1-POLYMATH** | + E10, E11, E12 | + canonical consumers + unified mastery + 2nd subject |
| **WORLD-CLASS** | + E13, E14, E15, E16 | + i18n 40/40 + no-hex + a11y + mobile perf + capacity |
