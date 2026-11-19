# M1 T1 — AI call-path truth map

Scope: read-only map of the current `feat/ai-routing-truth` tree before any T2
edit. Line numbers are from the working tree at that point (T0 commit
`6d83745`). No live provider call was made; no secret was read.

## Live hosted web entry points

| Entry | Real call chain | Provider actually selected today | Reported provider | Truth gap |
|---|---|---|---|---|
| Learn (Study) | `screens/tabs/study.tsx:359` → `lib/api.ts:115-130` (`askTutor`) → `lib/api.ts:49-111` (`getAIResponse`) → `lib/ai/providers.ts:17-35` (`callAIProxy`) | `callAIProxy` in hosted mode (`lib/api.ts:92-94`), but direct custom Groq at `lib/api.ts:71-89` and direct Anthropic at `lib/api.ts:88` / `lib/ai/providers.ts:96-121` are still reachable from the same `aiMode` switch. | `askTutor` returns only `{success,data,error}` (`lib/api.ts:34-38,115-130`); UI cannot tell which rail answered. | No single selector; reported source is absent. |
| Learn offline queue | `screens/tabs/study.tsx:370-384` queues the request when `isConnected === false`; cached explanation path `screens/tabs/study.tsx:170-178` | No provider decision during queueing; answer later re-enters `askTutor`. | None. | Offline source is not explicit to the caller. |
| Quiz (wired web tab) | `screens/tabs/quiz.tsx:67` → `hooks/useOrchestration.ts:153-229` → `learningOrchestrator.generateQuizQuestion` → `src/intelligence/pipelines/pipelineExecutor.ts:104-129` → `src/intelligence/routing/hybridInferenceRouter.ts:40-157` → `HybridRuntime` (`src/runtime/hybridRuntime.ts:46-119`) | `HybridInferenceRouter.decide()` chooses cache/local/cloud at `hybridInferenceRouter.ts:20-38`, but `execute()` does **not** call `decide()`; it maps `HybridRuntime` execution mode at `hybridInferenceRouter.ts:117-123`. `CloudLLMRouter` calls the empty stub `lib/cloud.ts:1-9`; `LocalLLMRouter` has a second Ollama fetch at `src/intelligence/routing/localLLMRouter.ts:6-28`. | `LLMResponse.route` (`localLLMRouter.ts:37-45`) is returned through `pipelineExecutor.ts:134-139`; it can say `cloud` while no hosted proxy call happens. | Reported route can be false; two independent routing systems. |
| Quiz direct generator | `lib/api.ts:252-347` (`generateQuizQuestion`) → `executeWithReliability` (`lib/ai/reliability.ts:51-403`) | `providers` built from `aiMode` at `lib/api.ts:282-285`; `hosted_claude`/`hosted_groq` aliases both call `callAIProxy` at `reliability.ts:211-217`. | `lib/api.ts:313,330` drops `result.provider`; roadmap keeps it at `lib/api.ts:245`. | Legacy alias `hosted_claude` is reported when the proxy was used. |
| Roadmap | `screens/self_directed/roadmap.tsx:67-71` → `lib/api.ts:134-250` → `executeWithReliability` | `providers` at `lib/api.ts:182-185`; proxy at `reliability.ts:211-217`. | `lib/api.ts:245` returns `result.provider`; UI branches on it at `roadmap.tsx:67-71`. | Same false `hosted_claude` alias; no Ollama reachability in selection. |
| Tutor session screen | `screens/tutor/session.tsx:84` → `askTutor` | Same `getAIResponse` switch. | No provider displayed. | Screen is currently unwired dead code per `STATUS.md:117-121`; included to avoid a second router if wired later. |
| Explanation helper | `lib/ai.ts:16-84` → `executeWithReliability` at `lib/ai.ts:58-72` | Duplicate provider array at `lib/ai.ts:51-54`; unused `getAIProvider` import at `lib/ai.ts:2` (dead helper always returns OFFLINE at `lib/aiProvider.ts:6-8`). | Helper returns text only (`lib/ai.ts:78`). | Duplicate routing logic; dead always-offline helper. |
| Embeddings | `lib/embeddings.ts:18-23` | `canUseLocalModelServer()` gate at `lib/ai/endpointPolicy.ts:42-47`; no hosted model used. | `null` on every failure. | Separate opt-in gate; not shared with chat selection but already fail-closed. |
| ai-proxy health | `supabase/functions/ai-proxy/health.ts:23-75`, flow test `tests/flows/aiProxy.health.test.ts` | Server-side Groq call; no client provider selection. | JSON health payload. | Out of client selector scope; keep server boundary intact. |

## Guard coverage before T2

- `scripts/qa/check-ai-boundary.mjs:31-39` blocks only `callAnthropic(`.
- `scripts/qa/check-ai-boundary.mjs:41-44` blocks only a non-empty literal default Ollama URL.
- The direct Groq `fetch` at `lib/api.ts:73-86` and direct Anthropic fetch at
  `lib/ai/providers.ts:103-120` are **not** detected by that guard. This evidence
  gate could pass while a direct provider rail remains reachable, so T2 must
  extend the guard at the real boundary.

## Dead / duplicate code to archive, not delete

- `lib/aiProvider.ts:1-20` — `getAIProvider()` hardcodes OFFLINE; no live decision.
- `lib/cloud.ts:1-9` — returns `''`; only used by the stub cloud router.
- `src/intelligence/routing/cloudLLMRouter.ts:10-18` — calls the stub, reports `cloud`.
- `src/intelligence/routing/localLLMRouter.ts:6-28` — independent Ollama fetch with no opt-in/reachability gate.
- `lib/ai/providers.ts:96-121` — direct client Anthropic fetch; must not be callable.
- `lib/ai/providers.ts:123-130` — disabled direct rail stub kept only for a clear error.

## T2 acceptance implied by this map

1. One pure `selectProvider(context)` decides `hosted_proxy → local_ollama → offline`.
2. `askTutor`, quiz, roadmap, explanation, and the orchestration router all use it.
3. The returned/reported provider is the selected and actually invoked provider.
4. Direct Groq/Anthropic client rails are archived or made unreachable; the QA
   guard fails if either returns.
