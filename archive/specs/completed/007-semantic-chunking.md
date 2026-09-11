# Spec 007: Semantic Recursive Chunking

## Metadata
- **Status:** in-progress
- **Owner Agent:** builder
- **Risk Level:** medium
- **Architectural Impact:** medium
- **Dependencies:** None
- **Last Updated:** 2026-05-10

---

## Goal
Replace naive character-based slicing in `lib/chunking.ts` with a recursive semantic chunker that preserves the structure of academic documents (headings, paragraphs, sentences).

## Design
The chunker will attempt to split text at the highest semantic level first and recurse until chunks are within the target size limits.
Hierarchy:
1. `\n\n` (Paragraphs/Sections)
2. `\n` (Lines/List items)
3. `. ` (Sentences)
4. ` ` (Words - Fallback)

## Implementation Boundaries
- **Primary File:** `lib/chunking/semanticChunker.ts`
- **Utility File:** `lib/chunking/index.ts` (Export bridge)
- **Constraint:** Must preserve markdown formatting markers where possible.

## Dependencies
- None.

## Verification Requirements
- [ ] Must pass `tests/chunking/semanticChunker.test.ts`.
- [ ] Must not split a sentence across chunks if the sentence length < `maxChunkSize`.
- [ ] Must maintain `chunkOverlap` to preserve context.

## Verification Checklist
- [ ] Implement `SemanticChunker` class with recursive splitting logic.
- [ ] Support metadata preservation (e.g. source page, header context).
- [ ] Implement chunk hashing for deduplication.
- [ ] Export via `lib/chunking/index.ts`.
- [ ] Add comprehensive tests for edge cases (empty strings, huge paragraphs).

## Audit Trail
- 2026-05-10 - Initial Spec Created.
