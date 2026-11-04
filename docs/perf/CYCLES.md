# Dependency Cycle Elimination — EasyTutor

Slice 3 of the web-performance directive. Baseline recorded **33 circular
dependencies** (`npx --yes madge --extensions ts,tsx --circular --ts-config
tsconfig.json app lib services store src`); after this slice the same command
reports **0**.

**Date:** 2026-11-04
**Baseline commit:** `a15dfff` (see `docs/perf/BASELINE.md`)

---

## Result

| Command | Before | After |
|---|---:|---:|
| `madge --circular` | 33 | **0** |
| `depcruise .dependency-cruiser.js` errors | not enforced | **0** |

## What was broken

The cycles were structural, not cosmetic:

1. **`store/roadmapStore` ⇄ `src/intelligence`** — the store imported the
   intelligence orchestrator to persist progress, and the orchestrator imported
   the store for the active learning mode. Two ways round.
2. **`lib/api` ⇄ `lib/ai/reliability`** — the reliability wrapper imported
   provider calls from `lib/api`, while `lib/api` imported `executeWithReliability`
   from the wrapper.
3. **`lib/api` → `store/roadmapStore`** — reading `learningMode` from a React
   store inside the AI rail dragged the whole store/intelligence graph back in.

## How they were removed

| Boundary | Change |
|---|---|
| Store → intelligence | `src/domain/learning/learningPort.ts` defines the persistence port the store actually needs. `store/learningGateway.ts` resolves it; `services/learningPort.ts` is the composition root and is loaded lazily, so the intelligence graph is out of the initial bundle. |
| Neutral portal state | `src/infrastructure/portalContext.ts` owns the active learning mode / user id. `store/roadmapStore` publishes into it on rehydration and mode changes; infrastructure and `lib/` read from it instead of importing the store. |
| AI rail ⇄ reliability | Provider HTTP calls moved to the leaf `lib/ai/providers.ts`. `lib/api` and `lib/ai/reliability` both import the leaf; `lib/api` re-exports the old names, so the public surface is unchanged. |
| Learning mode in prompts/AI | `services/systemPrompts.ts` imports `LearningMode` from `src/domain/learning/portal`; `lib/api.ts` and `lib/ai/reliability.ts` read `getActiveLearningMode()`. |
| Shared contracts | `src/runtime/types.ts` and `lib/performanceTypes.ts` hold contracts that used to be imported across sibling modules. |

`getActiveLearningMode()` fails closed to `null` when no portal has been
resolved; it never guesses a learner mode.

## Enforcement

- `npm run lint:cycles` → `depcruise --config .dependency-cruiser.js app lib services store src`
  (error-severity `no-circular` rule; already-installed tool, no new package).
- CI runs `Circular dependency check` before the architecture audit.
- `scripts/architecture/validate_boundaries.js` now rejects static
  `store/` → `src/intelligence` and `store/` → `services/learningPort`
  imports. The gate was observed failing on a probe file before being kept.

## Verification

- `npx tsc --noEmit` — 0 errors
- `npm run lint` — 0 errors
- `npm test` — 50 files / 239 tests passed
- `node scripts/qa/qa_runner.js` — success
- `npx expo export --platform web --source-maps` — exported
