# Spec 008: Background Ingestion Pipeline

## Metadata
- **Status:** in-progress
- **Owner Agent:** builder
- **Risk Level:** high
- **Architectural Impact:** high
- **Dependencies:** Spec 007
- **Last Updated:** 2026-05-10

---

## Goal
Transform the document ingestion process from a blocking UI operation into a resilient, background-queued pipeline to prevent JS-thread freezing and Supabase timeouts.

## Design
- **Queue:** Local queue state managed via Zustand or a simple class.
- **Worker:** Asynchronous loop that processes chunks in configurable batches.
- **State:** Persistent tracking of ingestion progress (`pending`, `processing`, `completed`, `failed`).

## Implementation Boundaries
- **Directory:** `lib/ingestion/`
- **Files:** `queue.ts`, `worker.ts`, `batching.ts`, `ingestionState.ts`.
- **Constraint:** Must not block the UI thread during embedding generation or database insertion.

## Dependencies
- `lib/chunking/semanticChunker.ts`
- `lib/embeddings.ts`
- `lib/supabaseOps.ts`

## Verification Requirements
- [ ] Large files (>100 pages) can be ingested without dropping UI frames (60fps).
- [ ] Supports cancellation of an active ingestion.
- [ ] Retries individual failed batches up to 3 times.

## Verification Checklist
- [ ] Implement `IngestionQueue` with priority support.
- [ ] Implement `IngestionWorker` with `p-limit` or similar concurrency control.
- [ ] Implement batching logic for Supabase vector inserts.
- [ ] Add progress event emitters for UI feedback.
- [ ] Integrate with `lib/knowledge.ts`.

## Audit Trail
- 2026-05-10 - Initial Spec Created.
