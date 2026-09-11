import { CanonicalChunk, CanonicalChunkMetadata } from './canonicalChunker';
import { validateCanonicalID } from '../taxonomies';
import { PortalType } from '../../types/canonical';

export class ChunkGovernance {
  static assertCanonicalChunk(chunk: CanonicalChunk): CanonicalChunk {
    if (!chunk.canonical_id || !chunk.content) {
      throw new Error('[INGESTION] Canonical chunk must include canonical_id and text content.');
    }

    if (!['high_school', 'university', 'knowledge_explorer'].includes(chunk.portal_type)) {
      throw new Error(`[INGESTION] Invalid portal_type ${chunk.portal_type}`);
    }

    if (!validateCanonicalID(chunk.canonical_id, chunk.portal_type as PortalType)) {
      throw new Error(`[INGESTION] Canonical chunk ID ${chunk.canonical_id} failed validation.`);
    }

    if (!chunk.subject_id || !chunk.topic_id) {
      throw new Error('[INGESTION] Canonical chunk must include subject_id and topic_id.');
    }

    return chunk;
  }

  static normalizeMetadata(metadata: CanonicalChunkMetadata): CanonicalChunkMetadata {
    return {
      ...metadata,
      semantic_tags: metadata.semantic_tags || [],
      retrieval_priority: Math.max(1, metadata.retrieval_priority),
      ingestion_timestamp: metadata.ingestion_timestamp || new Date().toISOString(),
    };
  }
}
