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
}

/**
 * Real, governed ingestion path for the knowledge workspace.
 *
 * - Documents and chunks are written through the governed layer so user_id /
 *   portal_type are stamped, RLS holds, and retrieval stays per-user.
 * - Chunk ids are deterministic (document id + index, or the provided id)
 *   so re-ingesting the same source is an idempotent upsert, never a
 *   duplicate.
 * - Fail-closed: a chunk is only stored once its embedding exists; an
 *   offline/embedding-less chunk is counted as failed, never silently
 *   dropped.
 * - Scope columns (taxonomy_scope / curriculum_scope / school_scope /
 *   vector_namespace) are stamped so match_document_chunks can route
 *   retrieval back to this subject.
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
}: StoreChunksOptions): Promise<StoreChunksResult> => {
  const total = chunks.length;
  let stored = 0;
  let failed = 0;
  const vectorNamespace = portalNamespaceFor(portalType);

  if (total === 0) {
    return { stored: 0, failed: 0, total: 0 };
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
      const embedding = await generateEmbedding(content);

      if (!embedding || embedding.length === 0) {
        failed += 1;
        continue;
      }

      // Deterministic chunk id: corpus-provided id wins (import idempotency),
      // otherwise document id + index (paste-text flow).
      const chunkId = providedId ?? stableHashId(`${documentId}|${index}`);
      await Database.governedWrite(
        'document_chunks',
        {
          id: chunkId,
          document_id: documentId,
          content,
          embedding,
          metadata: {
            documentId,
            title,
            chunkIndex: index,
            source: 'knowledge_explorer',
            ...chunkMeta,
          },
          taxonomy_scope: subjectId ?? undefined,
          curriculum_scope: curriculumScope ?? 'GLOBAL_OPEN',
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
  }

  return { stored, failed, total };
};
