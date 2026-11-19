# M1 T2 — one provider selector and truthful reporting

## Change

- Added pure `selectProvider(context)` in `lib/ai/providerSelection.ts`:
  `hosted_proxy → local_ollama → offline`, with explicit reasons.
- Added the only impure resolver `lib/ai/providerResolver.ts`; it reads settings,
  the Supabase session and Ollama reachability, then delegates the decision.
- All live AI call sites now consume that decision: `lib/api.ts` (`askTutor`,
  roadmap, quiz), `lib/ai.ts`, and
  `src/intelligence/routing/hybridInferenceRouter.ts`. The orchestration route
  is derived from the selected provider, so `cloud` can no longer be reported
  while a stub answered.
- `executeWithReliability` uses exactly one model rail. It never switches to a
  second rail after failure; cache/placeholder/offline are explicit fallbacks.
  `ReliabilityResult` now carries both `selectedProvider` and the actual source.
- Removed false `hosted_claude` / `hosted_groq` aliases from provider identity,
  analytics and breaker keys. Archived direct Groq/Anthropic and duplicate
  local/cloud router code with `git mv` under `archive/`.
- Extended `scripts/qa/check-ai-boundary.mjs` to fail on `api.groq.com` or
  `api.anthropic.com` in production code.

## Test adaptations (named and justified)

No test was deleted or skipped. Renames below are recorded explicitly; every
changed assertion is stronger than its predecessor.

`tests/reliability/aiReliability.test.ts`:

- `successfully executes primary provider hosted_claude` → `successfully executes the selected hosted proxy`. The old name asserted a false alias; the test now also asserts the exact rail called and that Ollama was not called.
- `falls back to local_ollama if cloud hosted_claude fails completely` → `uses the selected local rail without contacting the hosted proxy`. The old assertion required a silent cross-rail switch, which M1 forbids. The local rail is now selected up front and the proxy is asserted unused.
- `triggers timeout and falls back to subsequent provider` → `times out the selected local rail without switching to hosted`. The old test expected a hosted fallback after a local timeout; the replacement asserts failure to placeholder and zero proxy calls.
- `handles invalid Zod json responses by retrying or falling back` → `handles invalid Zod json responses by retrying`. Renamed only to describe the unchanged behaviour precisely.
- `returns placeholder if absolutely all providers in chain fail` → `returns placeholder when the selected hosted rail fails, never switching rails`. The local mock now proves it is never called.
- Added `returns offline immediately when the selector chose offline`: proves zero attempts and zero network calls when the selector fails closed.

`tests/flows/orchestration.contract.test.ts`:

- `routes offline requests to local model deterministically` → `routes offline requests to local model only when explicitly enabled and reachable`. The old test injected two archived routers and asserted `offline-local-only`; the replacement uses the real selector, proves opt-in plus reachability is required, and proves the no-local case maps to `offline_fallback`.
- The lesson-flow case gained `expect(callAIProxy).toHaveBeenCalledTimes(1)` after mocks for archived routers were removed; it now proves the governed path reaches the hosted network leaf.

`tests/flows/quiz.wrongAnswers.noOllama.test.ts`: a type-only import moved from
the archived `localLLMRouter` to the live `hybridInferenceRouter`; no assertion
changed.

`tests/flows/ollama.offline.test.ts`: the hosted session is removed at the auth
edge in `beforeEach` because M1 keeps hosted first whenever a session exists.
The sad-path expectation changed from generic `placeholder` to the honest
`offline` provider with an `Offline` error. No timeout or budget changed.

## Commands run this session

- `npm run typecheck` → 0 errors.
- `node scripts/qa/check-ai-boundary.mjs` → `[AI BOUNDARY] PASS`.
- `npx vitest run tests/reliability/aiReliability.test.ts tests/flows/orchestration.contract.test.ts tests/flows/quiz.wrongAnswers.noOllama.test.ts` → 3 files / 20 tests passed.
- `npx vitest run tests/flows/ollama.offline.test.ts tests/smoke/routes.smoke.test.tsx` → 2 files / 46 tests passed.
