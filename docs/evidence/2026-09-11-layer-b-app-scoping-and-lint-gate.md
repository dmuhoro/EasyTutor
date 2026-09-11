# Evidence — Sprint 6 Layer B: App-Scoped Source Tree + Real Lint Gate

**Date:** 2026-09-11 · **Branch:** `release/v1.0.0` · **Session:** Sprint 6 (Engineering OS Revival)

## Claim 1 — Archived `src/` layers are unreachable from the app surface

- **Verification:** `npx madge --json --extensions ts,tsx .` expanded reachability
  from the app entry surface (`app/`, `store/`, `lib/`, `data/`, `components/`,
  `hooks/`, `services/`, `constants/`, `types/`).
- **Result (before):** these `src/` subdirs had **0 / N files reached** and were
  archived wholesale to `archive/src/`:
  `api` (0/8), `billing` (0/4), `business` (0/29), `commercial` (0/36),
  `growth` (0/13), `market` (0/17), `maturity` (0/13), `productization` (0/8),
  `products` (0/12), `reliability` (0/10), `sdk` (0/4), `services` (0/160),
  `stabilization` (0/12), `ux` (0/3).
- **Surgical sub-tree archives** (same 0-reach rule, per sub-directory/file):
  `src/infrastructure/deployment` (0/6), `src/infrastructure/platform` (0/11)
  — `infrastructure/database` + `contextResolver` retained (load-bearing);
  `src/observability/{business,ops,platform,*.ts}` (keep `telemetry.ts`, 1/1);
  `src/agents/{autonomy,memory,multiagent}`; `src/runtime/{predictive,telemetry,
  *.ts,device/deviceOptimizer,offline/offlineRecoveryEngine}` (keep offline/local/
  agentic + deviceProfiler, all REACHED); `src/knowledge/{ingestion,index,
  knowledgeStore,validator}` (keep `taxonomies`, 2/2 reached).
- **Dependents archived with them:** 29 test files + `scripts/ingestion` whose
  `TS2307` imports stopped resolving once the layers moved (`tsc --noEmit`
  drove the closure — fail-closed, not by guesswork).
- **Proof of completion:** `npx tsc --noEmit` → **0 errors** with `archive/`
  excluded from `tsconfig.json`.

## Claim 2 — The lint gate was not protecting anything before

- **Verification:** `npx eslint .` with the old config → **4960 errors**.
- **Root cause:** `eslint.config.mjs` applied `js.configs.recommended` to node
  scripts with no `console`/Node globals (→ 3190 `no-undef`) and never ignored
  `archive/`/`dist/`; `package.json` masked it with `|| true`.
- **Fix:** flat config now ignores `archive/dist/node_modules/.expo` +
  config files, provides Node globals for `.js`, and keeps TS unused-var as
  warnings with `^_` patterns. `|| true` removed → `npm run lint` fails on
  errors.
- **Remaining real errors fixed (33):** 22 deliberate empty cache-fallbacks in
  `lib/` made explicit (`catch { /* best-effort: fall through to fallback */ }`),
  dead initializers in `lib/interventionEngine.ts`, `lib/questionBank.ts`,
  `lib/recommendations.ts`, `services/systemPrompts.ts`, rethrow wrapper in
  `lib/analytics.ts`, empty `if` in `app/_layout.tsx`, 5 `no-case-declarations`
  in `src/runtime/local/localInferenceEngine.ts` (wrapped in blocks), unused
  `err` in `scripts/qa/qa_runner.js`.
- **Result after:** **0 errors**, 139 `no-unused-vars` warnings (backlog).

## Claim 3 — Test suite re-scoped, not "reduced by accident"

- Before: 68 files / 255 tests. After: **39 files / 174 tests, all green** via the
  pre-commit gate (`npm run lint && npm run typecheck && npm test`) on every
  commit in this layer (`d053879`, last commit `...lint gate`).
- The 29 archived suites exercised only app-unreachable layers (payments,
  sales/success ops, agent/stability runtimes, multi-tenant platform, B2B e2e);
  each referenced at least one archived module (TS2307), so they could not run
  against the shipped app. All live-path engines (mastery, trends, MRR/spaced
  repetition, weakness, interventions, plans, adaptive curriculum, knowledge
  graph, coach, analytics reliability, flows) remain covered.

## Full gate matrix (post-layer, verified this session)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors (gate enforced) |
| Tests | `npm test` | ✅ 39 files / 174 tests |
| Boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations |
| QA | `node scripts/qa/qa_runner.js` | ✅ All systems verified |
| Build | `npx expo export --platform web` | ✅ Exported `dist/` |