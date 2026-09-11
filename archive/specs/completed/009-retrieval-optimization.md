# Spec 009: Retrieval Ranking & Context Assembly

## Metadata
- **Status:** in-progress
- **Owner Agent:** builder
- **Risk Level:** medium
- **Architectural Impact:** medium
- **Dependencies:** None
- **Last Updated:** 2026-05-10

---

## Goal
Optimize the semantic retrieval pipeline to improve the relevance and continuity of context provided to the AI tutor.

## Design
- **Scoring:** Implement a similarity threshold and secondary ranking based on recency or chunk density.
- **Deduplication:** Remove semantically identical chunks from the final context window.
- **Assembly:** Order chunks by their original position in the document to maintain semantic flow.

## Implementation Boundaries
- **File:** `lib/retrieval.ts`
- **Utility:** `lib/retrieval/ranking.ts`
- **Constraint:** Final context window must fit within the target AI model's context limits while maximizing relevance.

## Dependencies
- `lib/embeddings.ts`
- Supabase `match_document_chunks` RPC.

## Verification Requirements
- [ ] Retrieval results are ordered by semantic relevance AND document position.
- [ ] Duplicate chunks are successfully filtered.
- [ ] Context assembly handles token limits gracefully.

## Verification Checklist
- [ ] Implement `rankChunks` utility with multi-factor scoring.
- [ ] Implement `assembleContext` with semantic continuity logic.
- [ ] Update `lib/retrieval.ts` to use new ranking/assembly logic.
- [ ] Add observability hooks for retrieval quality.

## Audit Trail
- 2026-05-10 - Initial Spec Created.
