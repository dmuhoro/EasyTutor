# Spec 003: Semantic Chunking Upgrade

## Goal
Replace the naive character-count chunking in `lib/chunking.ts` with a "Semantic Chunker" that respects sentence boundaries and paragraph structures.

## Design
- **Logic:** Use a regex or simple NLP logic to split text at `.`, `!`, `?` or double newlines `\n\n`.
- **Constraint:** Maintain a target chunk size (e.g., 500-1000 characters) while ensuring chunks don't break in the middle of a sentence.

## Implementation Boundaries
- **File:** `lib/chunking.ts`.
- **Constraint:** Must not increase ingestion time by more than 20%.

## Dependencies
- `lib/extraction.ts`.

## Verification Checklist
- [ ] Sample document chunks do not contain partial sentences.
- [ ] No regression in RAG retrieval accuracy.
- [ ] Test suite `tests/lib/chunking.test.ts` passes.
