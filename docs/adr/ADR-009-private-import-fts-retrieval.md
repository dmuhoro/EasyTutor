# ADR 009: Private Imports, FTS-First Retrieval and Opt-In Embeddings

Status: **Accepted** (2026-11-17) · Supersedes ADR-003 and ADR-005 for the hosted web and
user-import paths only. ADR-003/005 remain historical for the local-only Ollama research
track; they are not the production retrieval contract.

## Problem

ADR-003 and ADR-005 require every ingested chunk to be embedded locally with Ollama before it
is searchable, and search to be pgvector cosine similarity. In the hosted web app this makes
Ollama a hard dependency: an import on a phone with no local model silently drops every chunk
(`lib/knowledge.ts` skipped rows without embeddings), and retrieval falls back to an `ilike`
scan that cannot rank or cite. Imports are also stamped `curriculum_scope=GLOBAL_OPEN`, which
breaks the promise that learner-uploaded content is private (Constitution Article I: a claim
"private only" that is not enforced is worse than no claim).

A further defect: retrieval path selection depends on whether localhost Ollama happens to be
reachable. A test that stubs the vector RPC passes on a developer machine with Ollama and fails
on CI without it (`quiz.wrongAnswers.test.ts`, `expected 0 >= 2`). That is nondeterminism from
external state, not a timeout.

## Decision

1. **FTS is the primary retrieval path.** `document_chunks` gains a `content_tsv` generated
   `tsvector` column and a GIN index via a forward-only migration. A ranked RPC
   `search_document_chunks_fts` accepts the query, portal/scope filters and `auth.uid()`, and
   returns `content`, `metadata` and a rank. No embedding is required for a chunk to be stored,
   retrievable or citable.
2. **Embeddings are optional.** When an embedding-capable model is explicitly enabled and
   reachable, the vector RPC may be used as an additional ranking signal; otherwise retrieval
   uses FTS. A missing model never drops a chunk and never fabricates a match — it returns
   `[]` only when nothing matches (fail closed, no silent drop).
3. **Ollama is strictly opt-in.** Default embedding URL is empty. No fetch to localhost is
   attempted on web unless the learner enabled local AI in settings and the endpoint is
   reachable. There is no attempt at module load or import time.
4. **Imports are private.** New explicit scope `USER_PRIVATE`. Every user-imported chunk is
   stamped `USER_PRIVATE` and `user_id = auth.uid()`. A forward-only migration relabels
   existing user-owned `GLOBAL_OPEN`/shared chunks to `USER_PRIVATE`. RLS keeps owner-scoped
   read/write; a token-less caller can read only reference tables. `GLOBAL_OPEN` is reserved
   for curated platform reference content and is never assigned by an import path.
5. **Health reports reality.** `ai-proxy/health` calls the provider's model-list endpoint with
   the configured key, intersects the callable models with `GROQ.MODEL_ALLOWLIST`, and returns
   that list. No model name is hardcoded from memory; a failed or empty intersection is a
   friendly, explicit error.
6. **AI traffic uses one boundary.** `askTutor`/`getAIResponse` and quiz callers call the
   server `ai-proxy`; the disabled direct-Anthropic rail is deleted or mapped to the proxy.
   Tests assert the proxy is reached with localhost blocked.

## Consequences

- Import works offline and without any local model; 50 chunks in → 50 rows stored → cited
  retrieval out. Retrieval quality is lexical until an optional embedding model is enabled.
- The vector RPC remains available for the local research track but is no longer required by
  the web app. A model change no longer forces re-embedding for searchability.
- `USER_PRIVATE` is additive and backward compatible via a forward-only data migration.
- Determinism: tests stub the retrieval boundary itself (the ranked RPC / proxy call), not an
  external Ollama process, so the same suite passes on a laptop with Ollama and on CI without.

## Rejected alternatives

- Keep ADR-003/005 and require users to install an embedding model: rejected — silently drops
  imports and violates the private-content promise.
- Raise the test timeout to hide the flake: rejected — it does not fix path selection.
- Stamp imports `GLOBAL_OPEN` for easier sharing: rejected — user content must be private.
