# Sprint 11 — Web Performance, Code-Splitting, and a Design System

**Date:** 2026-11-04 · **Branch:** `feature/mathematics-end-to-end-sprint` · **Predecessor:** Sprint 10 (governed cloud sync)
**Directive:** cut the web entry bundle by ≥40% gzip, remove every dependency cycle, make first paint non-blank, and leave a CI gate that refuses regressions.

All numbers below were produced by real commands on this branch and are archived
under `docs/perf/`. Nothing here is estimated; the before/after commands are
identical (`npx expo export --platform web`), and the final gate was observed
rejecting an artificial regression before it was kept.

## Result

| Metric | Baseline `a15dfff` | Final | Delta |
|---|---:|---:|---:|
| Entry JS raw | 3,949,700 B | **1,674,615 B** | **−57.6%** |
| Entry JS gzip −9 | 957,419 B | **437,705 B** | **−54.3%** |
| Entry source-map modules | 1,744 | **1,021** | −723 |
| Circular dependencies | 33 | **0** | −33 |
| Route chunks | 0 | **35** | +35 |

Target was **≥40%** gzip reduction; delivered **54.3%**.

## The eight slices (one commit each)

| # | Commit | Concern | Evidence |
|---|---|---|---|
| 1 | `a15dfff` | Revert the custom `app/+html.tsx` root template | `docs/perf/BASELINE.md` |
| 2 | `9558b2d` | Record the honest baseline (sizes, top modules, 33 cycles) | `docs/perf/BASELINE.md` |
| 3 | `8b9c344` | Eliminate all 33 dependency cycles without behaviour change | `docs/perf/CYCLES.md` |
| 4 | `7029ca7` | Cut unreachable modules: Ionicons-only imports, drop unused Anthropic SDK | `docs/perf/CUT.md` |
| 5 | `4b8ffb3` | Code-split 29 routes; defer analytics/Ollama startup probes | `docs/perf/SPLIT.md` |
| 6 | `017bc2f` | Render a font-free shell skeleton during auth/profile settle | `docs/perf/FIRST_PAINT.md` |
| 7 | `38aba0a` | Design tokens + primitives; reskin Auth and Home | `docs/design/DESIGN_SYSTEM.md` |
| 8 | this commit | CI entry-size budget that fails closed | `docs/perf/AFTER.md`, `docs/evidence/2026-11-04-web-entry-budget-gate.md` |

Two preparatory chores (`1e1b21c` lint ignores, `b8a146f` Expo patch alignment)
made the slice gates trustworthy but changed no product behaviour.

## What actually moved the bytes

- **Icons (slice 4):** 46 files imported the whole `@expo/vector-icons` barrel.
  Switching to the `Ionicons` subpath (the only family used) plus removing the
  unused `@anthropic-ai/sdk` cut 132 KB gzip before any route work.
- **Routes (slice 5):** every non-home screen is now a thin `React.lazy` wrapper
  in `app/**` pointing at a real screen in `screens/**`. `react-native-svg`,
  Reanimated, and `react-native-markdown-display` ride only in the chunks that
  need them. Home stays eager and does not import `react-native-svg` (it uses the
  DOM-free `components/ui/Meter.tsx`).
- **First paint (slice 6):** `AppSkeleton` renders immediately; a 1 s system-font
  grace means text is never blocked indefinitely, and the splash hides on
  fonts-settled instead of on profile resolution.
- **Design system (slice 7):** tokens in `src/design/tokens.ts` are the single
  source of truth (`lib/theme.ts` re-exports them). `Button`, `Chip`, `Skeleton`,
  `Toast`, `Meter` are token-driven; Auth and Home are rebuilt on them. The reskin
  costs ~12 KB gzip and buys a coherent, testable surface (contrast + token tests).

## Cycle elimination (slice 3) — why it was first

The 33 cycles were not cosmetic: `store ⇄ lib/intelligence` forced the entire
intelligence layer into the eager graph. The fix introduces a neutral portal
context (`src/infrastructure/portalContext.ts`), a domain port
(`src/domain/learning/learningPort.ts`) with a lazy gateway
(`store/learningGateway.ts` → `services/learningPort.ts`), a shared runtime type
module, and a leaf AI-provider module (`lib/ai/providers.ts`). `npm run
lint:cycles` (dependency-cruiser) now runs in CI, so a new cycle fails the build.

## The budget gate (slice 8) — fail closed

`perf-budget.json` records three ceilings: entry gzip **450,000 B**, entry raw
**1,750,000 B**, minimum route chunks **30**. `scripts/perf/check-entry-budget.js`
exits 1 when any ceiling is exceeded, when `dist/` is missing, when there is not
exactly one entry chunk, or when the route-chunk count regresses. It runs in CI
immediately after `Web export`.

The gate was **observed failing** on a forced 1,000 B budget before being kept
(`docs/evidence/2026-11-04-web-entry-budget-gate.md`). Budgets are tightened only
with a measured improvement; they are never raised to make CI green.

## Gates on final HEAD

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors / 129 warnings (tracked backlog) |
| Tests | `npm test` | ✅ 51 files / 246 tests |
| Cycles | `npm run lint:cycles` | ✅ 0 errors, 0 cycles |
| Boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations |
| QA runner | `node scripts/qa/qa_runner.js` | ✅ All systems verified |
| Web export | `npm run build` | ✅ `dist/` exported, 35 chunks |
| Size budget | `npm run perf:budget` | ✅ 437,616 B gzip / 1,674,478 B raw / 35 chunks |

Note: the flow tests use 5 s timeouts and can flake when the whole gate is run in
parallel on a loaded machine; run sequentially (as CI does) and they pass. This
is a test-harness property, not a product defect, and no test was weakened.

## Honest follow-ups (not silently assumed done)

- `src/infrastructure/evidence/index.ts` is still unreferenced. It was left in
  place rather than archived because it is governance-adjacent and needs its own
  spec decision; it is not on any runtime path.
- The 129 ESLint warnings (mostly unused vars) remain a cleanup backlog.
- `expo-router` + Supabase + react-dom stay in the entry chunk by necessity: the
  root layout must resolve auth before routing. Further reduction requires an
  architectural change (server-side auth shell), not a bundler tweak.
- Release/tag is deferred to the merge onto the release branch; this branch is a
  feature branch and the CHANGELOG entry is filed under `[Unreleased]`.
