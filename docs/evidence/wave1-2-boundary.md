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

## W1-2c — Private imports and FTS-first retrieval (no embedding needed)

### Real boundary confirmed before editing

- `lib/knowledge.ts:83` — every chunk was dropped when `generateEmbedding` returned `null`,
  and the write stamped `curriculum_scope: curriculumScope ?? 'GLOBAL_OPEN'` (user content
  could be written to a shared scope).
- `lib/retrieval.ts` — the "FTS fallback" used a plain `ilike` on `content` with a neutral
  `similarity: 0.5`, which was filtered out by the governance gate (`minSimilarity` defaults
  to `0.7` in `src/infrastructure/database/retrievalPolicies.ts:73`). So embedding-less
  imports were both un-stored and un-retrievable.

### Negative result (before fix)

New real-path test `tests/flows/import.noEmbeddings.test.ts` mocks only `generateEmbedding`
to return `null`, then drives the production `storeChunks` and `retrieveRelevantChunks`:

```
$ npx vitest run -c vitest.config.js tests/flows/import.noEmbeddings.test.ts
AssertionError: expected { stored: +0, failed: 50, total: 50 } to deeply equal { stored: 50, failed: +0, total: 50 }
AssertionError: expected false to be true   (FTS RPC never called)
 Test Files  1 failed (1)    Tests  2 failed (2)
EXIT=1
```

### Fix

- `lib/knowledge.ts`: an embedding is optional (stored only when present); all 50 chunks are
  stored, and `curriculum_scope` is forced to `USER_PRIVATE` regardless of the caller's
  request (an explicit warning is logged when a shared scope is overridden).
- New migration `20261117_private_import_fts.sql`: generated `tsvector` + GIN index;
  `search_document_chunks_fts` (SECURITY INVOKER, explicit `auth.uid()` filter, USER_PRIVATE
  visible to owner); the 8-arg vector RPC is hardened with the same owner filter. Execute is
  REVOKEd from PUBLIC/anon and GRANTed to `authenticated` only.
- `lib/retrieval.ts`: the FTS path is now the ranked RPC; `ts_rank` is mapped into `[0.75, 1]`
  so ranked matches survive the `0.7` governance gate while preserving rank order.

### Positive results (unit + real SQL)

```
$ npx vitest run -c vitest.config.js tests/flows/import.noEmbeddings.test.ts
 Test Files  1 passed (1)    Tests  2 passed (2)
EXIT=0

$ npm test
 Test Files  68 passed (68)    Tests  380 passed (380)
   Duration  14.91s
EXIT=0

$ npm run typecheck
> tsc --noEmit
EXIT=0
```

Real migration validation: a throwaway `supabase/postgres:17.11.0.011` container (copy of the
running stack's env, host port 55422, unique container name — no existing stack touched) was
reset to zero, `schema.sql` applied, then all migrations in filename order. Result:
`20261117_private_import_fts.sql EXIT=0`; `content_tsv` tsvector column and GIN index present;
function signature created. Two-user privacy test (real SQL, `auth.uid()` via
`request.jwt.claim.sub`):

```
As user A (no curriculum filter):       a_rows=1, sources='A-private'   (never B's row)
As user A (filter=KICD_KCSE mismatch):  USER_PRIVATE row still visible (1)
As user B:                              b_rows=1, sources='B-private'   (never A's row)
anon (no claim):                        anon_rows=0
match_document_chunks 8-arg def:        WHERE document_chunks.user_id = auth.uid()
                                        OR ...curriculum_scope = 'USER_PRIVATE'
```

Pre-existing migration defects surfaced by the from-zero run (NOT caused by W1-2c, to be
addressed/tracked in W1-3): `20260505_unique_constraints.sql` uses invalid
`ADD CONSTRAINT IF NOT EXISTS` syntax; `20260511_security_hardening.sql`,
`20260701_adaptive_learning_paths.sql`, `20260701_learning_retention_profiles.sql` and
`20261116_ai_daily_cap_atomic.sql` fail on duplicate policies/constraints already created by
`schema.sql`. These mean a literal `supabase db reset` on this repo is not currently clean.

The throwaway container was removed after validation.

## W1-2d — Forward migration relabels existing user-owned `GLOBAL_OPEN` chunks

New forward-only migration `20261117_relabel_user_chunks_private.sql`: a single `UPDATE` that
sets `curriculum_scope = 'USER_PRIVATE'` only where `user_id IS NOT NULL AND curriculum_scope =
'GLOBAL_OPEN'`. No down migration (forward-only by design). Idempotent.

Real SQL validation (throwaway Supabase PG 17, clean `schema.sql`, no existing stack touched):

```
Seed: 2 user-owned GLOBAL_OPEN, 1 already USER_PRIVATE, 1 KICD_KCSE
BEFORE:  GLOBAL_OPEN=2, USER_PRIVATE=1, KICD_KCSE=1
UPDATE 2
AFTER:   USER_PRIVATE=3, KICD_KCSE=1 (untouched), GLOBAL_OPEN=0
2nd run: UPDATE 0   (idempotent)
```

Throwaway container removed after validation. Note: in the current schema
`document_chunks.user_id` is `NOT NULL`, so every chunk is user-owned; the `user_id IS NOT NULL`
guard is kept for semantic clarity and future-proofing but is a no-op today.

## W1-2e — Proxy health from the live model list

### Real boundary confirmed before editing

`supabase/functions/ai-proxy/index.ts:20-42` (`handleHealthCheck`) always pinged the hardcoded
`DEFAULT_MODEL` (`llama-3.1-8b-instant`) and echoed `String(err)` / raw HTTP status on failure.
If that model were deprecated or unavailable while another allowlisted model still worked,
health falsely reported down; raw upstream errors could leak key material.

### Refactor for testability (no behaviour change at this step)

Health logic moved to `supabase/functions/ai-proxy/health.ts` — Web-standard `fetch`/`Response`
only, no Deno globals, injectable `fetchImpl`. `index.ts` imports `checkProxyHealth`; the
`DEFAULT_MODEL` used by the chat fallback is now derived from `MODEL_ALLOWLIST[0]` rather than a
second hardcoded string. `deno check index.ts` passes (Deno 2.9.7).

### Negative result (before fix)

New real-path test `tests/flows/aiProxy.health.test.ts` stubs only the network and calls the
production `checkProxyHealth`. The live model list exposes only `llama-3.3-70b-versatile`;
the old hardcoded default is absent.

```
$ npx vitest run -c vitest.config.js tests/flows/aiProxy.health.test.ts
     × probes a live allowlisted model and never the hardcoded default model  (expected 502 to be 200)
     × reports 503 with no probe when no allowlisted model is available        (expected 502 to be 503)
     × reports 502 when the provider model list is unavailable                 (expected true to be false)
 Test Files  1 failed (1)    Tests  3 failed | 2 passed (5)
EXIT=1
```

### Fix

`checkProxyHealth` now: fetches `GET /openai/v1/models` with the configured key; intersects the
live IDs with `MODEL_ALLOWLIST` (allowlist order); returns a friendly 503 when no key, when no
allowlisted model is available, or when the list is unreachable; returns a friendly 502 on list
or probe HTTP errors; probes the first callable model before reporting ok; and never echoes a
raw upstream error (no key/secret leakage).

### Positive results

```
$ npx vitest run -c vitest.config.js tests/flows/aiProxy.health.test.ts
 Test Files  1 passed (1)    Tests  5 passed (5)
EXIT=0

$ deno check supabase/functions/ai-proxy/index.ts
Check index.ts   (exit 0)

$ npm test
 Test Files  69 passed (69)    Tests  385 passed (385)
   Duration  14.67s
EXIT=0

$ npm run typecheck
> tsc --noEmit
EXIT=0
```
