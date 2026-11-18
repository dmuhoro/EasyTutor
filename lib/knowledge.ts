import { Database } from '../src/infrastructure/database';
import { generateEmbedding } from './embeddings';
import { stableHashId } from './stableId';
import { PortalType } from '../src/types/canonical';
import { portalNamespaceFor } from '../src/infrastructure/database/portalFilters';

export interface StoreChunksResult {
  stored: number;
  failed: number;
  total: number;
}

/** A single chunk to store. `id` is the deterministic chunk id (used for
 *  import idempotency: re-importing the same corpus id upserts, never
 *  duplicates). `metadata` is per-chunk (source, chapter, page, ...). */
export interface ChunkInput {
  id?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface StoreChunksOptions {
  userId: string;
  portalType: PortalType;
  documentId: string;
  title: string;
  chunks: ChunkInput[];
  subjectId?: string;
  curriculumScope?: string;
  schoolScope?: string;
  onChunkProcessed?: (processed: number, total: number) => void;
}

/**
 * Real, governed ingestion path for the knowledge workspace.
 *
 * - Documents and chunks are written through the governed layer so user_id /
 *   portal_type are stamped, RLS holds, and retrieval stays per-user.
 * - Chunk ids are deterministic (document id + index, or the provided id)
 *   so re-ingesting the same source is an idempotent upsert, never a
 *   duplicate.
 * - A chunk is stored even when no embedding model is available (ADR-009).
 *   Embeddings are optional; a missing model must never silently drop an
 *   import. Retrieval uses the ranked FTS RPC in that case.
 * - Every import is USER_PRIVATE regardless of the caller's requested scope;
 *   user content is never written to a shared/curriculum scope.
 * - Scope columns (taxonomy_scope / curriculum_scope / school_scope /
 *   vector_namespace) are stamped so retrieval can route back to this subject.
 */
export const storeChunks = async ({
  userId,
  portalType,
  documentId,
  title,
  chunks,
  subjectId,
  curriculumScope,
  schoolScope,
  onChunkProcessed,
}: StoreChunksOptions): Promise<StoreChunksResult> => {
  const total = chunks.length;
  let stored = 0;
  let failed = 0;
  const vectorNamespace = portalNamespaceFor(portalType);

  if (total === 0) {
    return { stored: 0, failed: 0, total: 0 };
  }

  if (curriculumScope && curriculumScope !== 'USER_PRIVATE') {
    // No silent drop of the request's intent, but never a silent downgrade of
    // privacy either: the override is explicit in the log and in the stored row.
    console.warn('[KNOWLEDGE] import curriculum_scope overridden to USER_PRIVATE (user content is private).');
  }

  try {
    // Parent document needs its own row so RLS on document_chunks resolves.
    // Upsert on the deterministic id.
    await Database.governedWrite(
      'documents',
      { id: documentId, title },
      { portalType, userId, matchFields: { id: documentId } }
    );
  } catch (err) {
    console.error('[KNOWLEDGE ERROR] document row failed', err);
    throw err;
  }

  for (let index = 0; index < chunks.length; index++) {
    const { id: providedId, content, metadata: chunkMeta } = chunks[index];
    try {
      // Optional signal only: no embedding never blocks storage. `undefined`
      // is omitted by the governed write, leaving the vector column NULL.
      const embedding = await generateEmbedding(content);

      // Deterministic chunk id: corpus-provided id wins (import idempotency),
      // otherwise document id + index (paste-text flow).
      const chunkId = providedId ?? stableHashId(`${documentId}|${index}`);
      await Database.governedWrite(
        'document_chunks',
        {
          id: chunkId,
          document_id: documentId,
          content,
          ...(embedding && embedding.length > 0 ? { embedding } : {}),
          metadata: {
            documentId,
            title,
            chunkIndex: index,
            source: 'knowledge_explorer',
            ...chunkMeta,
          },
          taxonomy_scope: subjectId ?? undefined,
          // Private by construction: an import caller cannot opt into a shared scope.
          curriculum_scope: 'USER_PRIVATE',
          school_scope: schoolScope ?? undefined,
          vector_namespace: vectorNamespace,
        },
        { portalType, userId, matchFields: { id: chunkId } }
      );
      stored += 1;
    } catch (err) {
      console.error('[KNOWLEDGE ERROR] chunk write failed', err);
      failed += 1;
    }
    onChunkProcessed?.(index + 1, total);
  }

  return { stored, failed, total };
};
