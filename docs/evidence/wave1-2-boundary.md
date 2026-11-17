# W1-2 evidence — T2 at the real boundary

Session 2026-11-17. Every number below comes from a command run in this session.
Work is split into ordered sub-commits; each section records its own negative result first.

## Real call sites confirmed before editing

```
$ grep -rn "callAnthropic" app lib screens services src store  (before fix)
lib/api.ts:92:    return await callAnthropic(systemPrompt, messages);
lib/ai/reliability.ts:212: return await callAnthropic(systemPrompt, messages);
```

`askTutor` (`lib/api.ts:113`) is the single entry used by `screens/tabs/study.tsx:341`,
`screens/tutor/session.tsx:84` and `lib/aiQuiz.ts:73,129`. Mapping `getAIResponse` and the
legacy `hosted_claude` reliability id therefore closes every Learn/quiz caller at the real
boundary, not in a test-only helper.

## W1-2a — Proxy routing and disabled direct rail

### Negative result (before fix)

New real-path test `tests/flows/aiProxy.boundary.test.ts` calls the production `askTutor` with
`aiMode: 'hosted'` and a legacy loopback URL, stubs only the Supabase auth token lookup and the
network socket, blocks every loopback fetch, and asserts a POST to
`/functions/v1/ai-proxy`.

```
$ npx vitest run -c vitest.config.js tests/flows/aiProxy.boundary.test.ts
[AI API] askTutor failed: Anthropic direct-from-client rail is disabled: use the server-side proxy.
AssertionError: expected false to be true   (result.success)
 ❯ tests/flows/aiProxy.boundary.test.ts:45:28
 Test Files  1 failed (1)    Tests  1 failed (1)
EXIT=1
```

### Fix

- `lib/api.ts` imports/re-exports `callAIProxy`; the default branch of `getAIResponse`
  calls the server proxy. The custom-provider branch with a learner-supplied key is unchanged.
- `lib/ai/reliability.ts` maps the legacy `hosted_claude` provider id to `callAIProxy`; the
  disabled `callAnthropic` import is gone.
- New fail-closed CI gate `scripts/qa/check-ai-boundary.mjs` (`npm run check:ai-boundary`)
  rejects any production call to `callAnthropic(`.

### Positive result

```
$ npm run check:ai-boundary
[AI BOUNDARY] PASS — no production call to the disabled direct AI rail.
EXIT=0

$ npx vitest run -c vitest.config.js tests/flows/aiProxy.boundary.test.ts
 Test Files  1 passed (1)    Tests  1 passed (1)
EXIT=0

$ grep -rn "callAnthropic" app lib screens services src store
lib/api.ts:23:  callAnthropicFetch,
lib/api.ts:29:export { callOllama, callAnthropicFetch, callAIProxy };
lib/api.ts:88:            return await callAnthropicFetch(systemPrompt, messages, customApiKey);
lib/ai/providers.ts:83:export async function callAnthropicFetch(
lib/ai/providers.ts:110:export async function callAnthropic(
```

Only the disabled stub definition and the explicit custom-key rail remain; no production
caller invokes the disabled rail.

```
$ npm test
 Test Files  66 passed (66)
      Tests  373 passed (373)
   Duration  21.43s
EXIT=0

$ npm run typecheck
> tsc --noEmit
EXIT=0
```

## W1-2b — Ollama strictly opt-in

### Negative result (before fix)

New real-path test `tests/flows/ollama.optin.test.ts` calls the production `generateEmbedding`
with only the network stubbed, on the test web runtime:

```
$ npx vitest run -c vitest.config.js tests/flows/ollama.optin.test.ts
     × never fetches in hosted mode even with a legacy persisted loopback URL
     × never fetches in local mode when the URL is empty
     × never fetches on web against a loopback URL even when local mode is enabled
     × probes reachability and does not embed when an allowed LAN server is down
     × embeds only when local mode is explicit and an allowed server answers
 Test Files  1 failed (1)    Tests  5 failed (5)
EXIT=1
```

`generateEmbedding` fetched `/api/embeddings` in every case, including hosted mode and an
empty URL (which produced a request to a relative URL).

### Fix

- `defaultOllamaUrl()` now returns `''` and `settingsStore` uses it as the default; no
  `expo-constants` host guessing remains.
- `generateEmbedding` returns `null` without any fetch unless `canUseLocalModelServer`
  allows the URL; it then probes `/api/tags` and only embeds when the server answers.
- `callOllama` fails closed with an explicit error on an empty URL, a web loopback URL, or an
  unreachable server — this covers both `getAIResponse` and the reliability chain at the real
  boundary.
- `getInstalledOllamaModels` / `checkOllamaModelAvailability` no longer fetch with an empty URL.
- The AI-boundary CI gate also rejects a non-empty default Ollama URL in `settingsStore.ts`.

### Positive results

```
$ npx vitest run -c vitest.config.js tests/flows/ollama.optin.test.ts
 Test Files  1 passed (1)    Tests  5 passed (5)
EXIT=0

$ npm test
 Test Files  67 passed (67)
      Tests  378 passed (378)
   Duration  14.90s
EXIT=0

$ npm run check:ai-boundary
[AI BOUNDARY] PASS — no disabled direct rail call; Ollama default URL is empty.
```

`tests/flows/ollama.offline.test.ts` was strengthened (not loosened): it now asserts the
reachability probe at `/api/tags` precedes `/api/chat`, and that an unreachable server makes
no chat request at all.

**Observed transient (W1-2a):** one pre-commit hook run reported 3 failures in 2 test files;
the failing names were not captured. Four consecutive full `npm test` runs afterwards were
green (373/373 on W1-2a, 378/378 on W1-2b). This is recorded, not dismissed: any recurrence
will be investigated before the layer is called done.

*(W1-2c–e recorded below as each sub-commit lands.)*
