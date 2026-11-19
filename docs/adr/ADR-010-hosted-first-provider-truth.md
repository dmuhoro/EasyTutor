# ADR 010: Hosted-first provider truth and one selection boundary

Status: **Accepted** (2026-11-19) · Supersedes ADR-002's local-first default for the
hosted web app. ADR-002 remains historical for the original local research track.

## Problem

ADR-002 made local Ollama the default and allowed complexity/mastery heuristics to
choose a different rail. The production code had since accumulated several provider
names (`hosted_claude`, `hosted_groq`, `hosted_proxy`) that all called the same
server proxy, while the reliability wrapper could silently switch from a failed
hosted rail to local. A caller could therefore be told one provider was used while
a different rail actually answered. That violates Constitution Article IV and
Article I's ban on false protection claims.

## Decision

1. `lib/ai/providerSelection.ts` holds the only pure decision function:
   `selectProvider(context)` with precedence **hosted proxy → enabled and
   reachable Ollama → offline**. Its inputs are facts; it performs no I/O.
2. `lib/ai/providerResolver.ts` is the only impure fact gatherer (settings,
   Supabase session, endpoint policy and reachability). Every live AI path —
   `lib/api.ts`, `lib/ai.ts` and `src/intelligence/routing/hybridInferenceRouter.ts`
   — resolves its rail through this module.
3. `executeWithReliability` wraps exactly one selected model rail. Retries and
   the circuit breaker operate inside that rail; cache, placeholder and offline
   are explicit fallbacks reported as such. Results carry both `provider` (what
   actually answered) and `selectedProvider` (the pre-retry decision).
4. Direct-from-client Groq/Anthropic helpers and duplicate routers are archived
   with `git mv`. The boundary guard rejects their endpoints in production code.
5. The orchestration `route` is derived from the same provider decision, so
   `cloud` can no longer be reported while a local stub answered.

## Consequences

- The ADR-002 default and complexity heuristic are no longer authoritative for
  production. Local Ollama remains usable when explicitly enabled and reachable,
  including while offline; otherwise the system fails closed to `offline`.
- A failed selected rail never silently switches to another model rail. The
  caller receives a clear error/fallback source and, where applicable, the
  offline queue retains the request.
- Tests exercise the real selector, resolver, router and reliability wrapper;
  only `fetch` or the provider network leaf is mocked.

## Rejected alternatives

- Keep multiple provider aliases and add a mapping table: rejected — aliases
  preserve the false reporting that caused this defect.
- Let the reliability wrapper retry a second rail after failure: rejected —
  that is a hidden routing decision outside the single selector.
- Keep ADR-002's local-first default: rejected — it contradicts the hosted
  proxy contract in Constitution Article IV and the current deployment model.
