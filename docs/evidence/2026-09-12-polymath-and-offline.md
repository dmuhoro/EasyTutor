# Evidence — Sprint 7: Engine Honesty, Offline/Ollama, Polymath Mode

**Date:** 2026-09-12 · **Branch:** `release/v1.0.0` · **Session:** Sprint 7

> The RPC claim below was a real silent break (FALSE-RETURN class): the code asked
> Supabase for a 3-arg function that carried a nonexistent column, got an error, caught
> it, and returned `[]` — behaving as "no matches" while never matching. That is now
> closed by an 8-arg RPC that exists and is exercised by tests through the real path.

## Claim 1 — Real RAG: `match_document_chunks` now exists with the full signature

- Before: `lib/retrieval.ts` called `rpc('match_document_chunks', { query_embedding,
  match_count, min_similarity, portal_type, taxonomy_scope, curriculum_scope,
  school_scope, vector_namespace })` but the deployed function (`20260510_vector_scaling.sql`)
  accepted only 3 args and selected a `metadata` column that `document_chunks` did not
  have → every retrieval error+`[]` (silent false negative).
- Fix: new `match_document_chunks` (`20260912_polymath.sql` + `schema.sql`) with 8 args,
  NULL-default scope filters matching `lib/retrieval.ts`, `metadata` selected, and
  self-owned `user_id` on `document_chunks` so RLS (`auth.uid() = user_id`) scopes
  retrieval per user under a SECURITY INVOKER, STABLE function.
- Verified: `tests/flows/polymath.flow.test.ts` seeds RPC results and asserts real
  `retrieveRelevantChunks` returns ranked chunks through the actual code path
  (`retrieveRelevantChunks` → mock `rpc`), and that an empty embedding returns `[]`
  without touching the RPC (fail-closed).

## Claim 2 — Free-form roadmap persistence is idempotent and enforced

- `learning_goals` unique on `(user_id, topic)`. Writes go through
  `Database.governedWrite` (stamps `user_id`/`portal_type`/`updated_at`);
  `saveLearningGoal` refuses any portal other than `knowledge_explorer`
  (`[GOVERNANCE ERROR]`), asserted in tests (row count stays 0 on refusal).
- Deterministic chunk ids (`stableHashId(documentId|index)`) mean re-ingesting the same
  source upserts 2 rows, not 4 — asserted in tests; `documents` parent row created once.
- Latest change-branch: `store/roadmapStore.ts` free-form save now persists to the cloud
  instead of failing loudly; `fetchSavedRoadmaps` rehydrates from `learning_goals`
  merging local-first by topic (never overwrites checked-in progress).

## Claim 3 — PostgREST correctness: no phantom `_matchFields` column

- `governedWrites.stampPayload` previously injected `_matchFields` into every row; real
  PostgREST rejects unknown columns. Now conflict keys travel only via `onConflict`
  options; the test mock derives conflict keys from `_options.onConflict`, and tests
  assert stored rows contain no `_matchFields` key.

## Claim 4 — No silent drops in ingestion

- `lib/knowledge.ts` returns `{ stored, failed, total }`; a chunk without a usable
  embedding (offline Ollama) is counted as failed, never stored and never silently
  dropped. Embedding failure now returns `null` (previously a believable-but-empty `[]`).

## Full gate matrix (post-Phase C, verified this session)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors (133 tracked warnings) |
| Tests | `npm test` | ✅ 41 files / 181 tests |
| Boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations |
| QA | `node scripts/qa/qa_runner.js` | ✅ All systems verified |
| Build | `npx expo export --platform web` | ✅ Exported `dist/` |

Commits: `cd93c0d` (A) · `a13ad11` (B) · `642301b` (C) · docs commit (this file).

## Unchanged, still out of scope (honesty)

- Live-network round-trip against a real Supabase/Ollama instance still needs env
  credentials and a device on the same network (external). Static schema↔code alignment
  + the full test suite are the substitution until then.
- 133 `no-unused-vars` warnings and `any` sites remain tracked backlog, not reintroduced.