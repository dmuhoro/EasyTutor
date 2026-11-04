# Web Performance Baseline — EasyTutor

Captured after reverting `app/+html.tsx` (commit `4b48819`) and before any
performance work. This is the reference point for the `entry JS −40%` target.

**Date:** 2026-11-04
**Commit:** `a15dfff` (`revert(web): remove custom root HTML template`)
**Command:** `npx expo export --platform web --source-maps`
**Expo SDK:** 57.0.31 · **expo-router:** 57.0.29 · **Node:** v22.22.1

---

## Entry bundle

| Metric | Value |
|---|---|
| Entry file | `dist/_expo/static/js/web/entry-adb4e8f810ee79f65d7f70e77fb14fde.js` |
| Entry JS raw | **3,949,700 B** (3.77 MiB) |
| Entry JS gzip (`gzip -9`) | **957,419 B** (935.0 KiB) |
| Source-map module count | **1,744** |
| Source-map total source bytes | 7,462,087 B |
| Export wall clock | ~14 s |

All web bundles in this baseline: entry + `Clipboard` + `Haptics` chunks.

## 20 largest modules (by source bytes in the entry source map)

| # | Bytes | Module |
|---:|---:|---|
| 1 | 536,016 | `node_modules/react-dom/cjs/react-dom-client.production.js` |
| 2 | 220,038 | `node_modules/@supabase/auth-js/dist/module/GoTrueClient.js` |
| 3 | 217,499 | `node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json` |
| 4 | 120,854 | `node_modules/@supabase/postgrest-js/dist/index.mjs` |
| 5 | 102,622 | `node_modules/tailwind-merge/dist/bundle-mjs.mjs` |
| 6 | 97,233 | `node_modules/@supabase/storage-js/dist/index.mjs` |
| 7 | 76,984 | `node_modules/zod/v4/core/schemas.js` |
| 8 | 64,155 | `node_modules/react-native-web/dist/vendor/react-native/VirtualizedList/index.js` |
| 9 | 58,876 | `node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome6Free.json` |
| 10 | 55,146 | `node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialIcons.json` |
| 11 | 54,057 | `node_modules/@supabase/phoenix/priv/static/phoenix.mjs` |
| 12 | 50,097 | `node_modules/buffer/index.js` |
| 13 | 45,601 | `node_modules/zod/v4/classic/schemas.js` |
| 14 | 44,868 | `node_modules/entities/lib/maps/entities.json` |
| 15 | 40,384 | `node_modules/react-native-svg/lib/module/lib/extract/transform.js` |
| 16 | 39,284 | `node_modules/react-native-css-interop/.cache/web.css` |
| 17 | 38,268 | `node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js` |
| 18 | 38,267 | `node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome6Free_meta.json` |
| 19 | 36,136 | `node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json` |
| 20 | 34,975 | `node_modules/expo-router/build/getRoutesCore.js` |

The dominant weight is not application code: React DOM, Supabase auth/storage,
icon glyph maps, and validation libraries account for the majority of the
entry. The app's own code is reachable through the root layout and therefore
ships in the same entry bundle even for routes a web visitor never opens.

## Circular dependency baseline

Command:

```bash
npx madge --circular --extensions ts,tsx --ts-config tsconfig.json \
  --exclude '(node_modules|archive|dist|\.expo)' .
```

Result: **33 circular dependencies across 291 processed files.**

```text
✖ Found 33 circular dependencies!

1) lib/analytics.ts > lib/supabaseOps.ts > src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts
2) lib/supabaseOps.ts > src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > lib/resolveTopicId.ts
3) src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts
4) lib/analytics.ts > lib/supabaseOps.ts > src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/mastery/masteryCoordinator.ts > lib/mastery.ts
5) store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/mastery/masteryCoordinator.ts > lib/mastery.ts
6) src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/mastery/masteryCoordinator.ts > src/intelligence/runtime/runtimeContext.ts
7) src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/mastery/masteryCoordinator.ts > src/observability/telemetry.ts
8) src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/memory/index.ts > src/intelligence/memory/learnerMemory.ts
9) src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/memory/index.ts > src/intelligence/memory/learningHistoryGraph.ts
10) src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/memory/index.ts > src/intelligence/memory/masteryMemory.ts
11) src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/memory/index.ts > src/intelligence/memory/weakPointMemory.ts
12) src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/orchestrator/learningOrchestrator.ts
13) lib/ai/reliability.ts > lib/analytics.ts > lib/supabaseOps.ts > src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/orchestrator/learningOrchestrator.ts > src/intelligence/pipelines/adaptiveFlowEngine.ts > src/intelligence/pipelines/pipelineExecutor.ts > lib/aiQuiz.ts > lib/api.ts
14) lib/supabaseOps.ts > src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/orchestrator/learningOrchestrator.ts > src/intelligence/pipelines/adaptiveFlowEngine.ts > src/intelligence/pipelines/pipelineExecutor.ts > lib/aiQuiz.ts > lib/api.ts
15) store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/orchestrator/learningOrchestrator.ts > src/intelligence/pipelines/adaptiveFlowEngine.ts > src/intelligence/pipelines/pipelineExecutor.ts > lib/aiQuiz.ts > lib/api.ts > services/systemPrompts.ts
16) store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/orchestrator/learningOrchestrator.ts > src/intelligence/pipelines/adaptiveFlowEngine.ts > src/intelligence/pipelines/pipelineExecutor.ts > lib/aiQuiz.ts > lib/api.ts
17) lib/supabaseOps.ts > src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/orchestrator/learningOrchestrator.ts > src/intelligence/pipelines/adaptiveFlowEngine.ts > src/intelligence/pipelines/pipelineExecutor.ts > lib/retrieval.ts
18) src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/orchestrator/learningOrchestrator.ts > src/intelligence/pipelines/adaptiveFlowEngine.ts > src/intelligence/pipelines/pipelineExecutor.ts > lib/retrieval.ts
19) src/runtime/hybridRuntime.ts > src/runtime/cognitiveExecutionGraph.ts
20) src/runtime/hybridRuntime.ts > src/runtime/cognitiveExecutionGraph.ts > src/runtime/local/localInferenceRouter.ts
21) src/runtime/hybridRuntime.ts > src/runtime/cognitiveExecutionGraph.ts > src/runtime/local/localInferenceRouter.ts > src/runtime/local/localInferenceEngine.ts
22) src/runtime/hybridRuntime.ts > src/runtime/cognitiveExecutionGraph.ts > src/runtime/local/localInferenceRouter.ts > src/runtime/local/localInferenceEngine.ts > src/runtime/offline/localCognitiveStore.ts
23) src/runtime/hybridRuntime.ts > src/runtime/cognitiveExecutionGraph.ts > src/runtime/offline/offlineInferenceEngine.ts
24) src/runtime/hybridRuntime.ts > src/runtime/executionBudgetManager.ts
25) src/runtime/hybridRuntime.ts > src/runtime/executionBudgetManager.ts > src/runtime/inferencePolicyEngine.ts
26) src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/orchestrator/learningOrchestrator.ts > src/intelligence/pipelines/adaptiveFlowEngine.ts > src/intelligence/pipelines/pipelineExecutor.ts > src/intelligence/routing/hybridInferenceRouter.ts > src/runtime/hybridRuntime.ts > src/runtime/runtimeGovernor.ts
27) src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/orchestrator/learningOrchestrator.ts > src/intelligence/pipelines/adaptiveFlowEngine.ts > src/intelligence/pipelines/pipelineExecutor.ts > src/intelligence/routing/hybridInferenceRouter.ts > src/runtime/hybridRuntime.ts > src/runtime/runtimeGovernor.ts
28) src/runtime/hybridRuntime.ts > src/runtime/runtimeGovernor.ts
29) src/runtime/hybridRuntime.ts > src/runtime/runtimeScheduler.ts
30) src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/reasoning/index.ts > src/intelligence/reasoning/reasoningEngine.ts > src/intelligence/retrieval/masteryAwareRetriever.ts > src/intelligence/retrieval/governedRetriever.ts
31) src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > src/intelligence/index.ts > src/intelligence/reasoning/index.ts > src/intelligence/reasoning/reasoningEngine.ts > src/intelligence/retrieval/masteryAwareRetriever.ts > src/intelligence/retrieval/governedRetriever.ts > src/intelligence/retrieval/semanticSearchEngine.ts
32) src/infrastructure/database/index.ts > src/infrastructure/contextResolver.ts > store/roadmapStore.ts > store/progressStore.ts
33) lib/performanceEngine.ts > lib/trendEngine.ts
```

Root causes:

1. `src/infrastructure/contextResolver.ts` reads `store/roadmapStore` directly,
   so every database/analytics import looped back through the store.
2. `store/roadmapStore.ts` and `store/progressStore.ts` import
   `src/intelligence` directly, pulling the whole service graph (and `lib/api`)
   back into the store layer.
3. `src/runtime/*` uses `hybridRuntime.ts` itself for shared request/execution
   types, so every child engine pointed back at its parent.
4. `lib/trendEngine.ts` imports types from `lib/performanceEngine.ts` while the
   performance engine imports the trend recorder.
