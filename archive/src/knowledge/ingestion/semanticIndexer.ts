import { Database } from '../../infrastructure/database';
import { CanonicalChunk, CanonicalChunker } from './canonicalChunker';
import { CanonicalEmbeddingRegistry } from './canonicalEmbeddingRegistry';
import { Telemetry } from '../../observability/telemetry';

export interface SemanticIndexResult {
  indexed: number;
  duplicates: number;
  portal_type: CanonicalChunk['portal_type'];
}

export class SemanticIndexer {
  static async indexChunks(chunks: CanonicalChunk[]): Promise<SemanticIndexResult> {
    const uniqueChunks = chunks.filter((chunk) => {
      const exists = CanonicalEmbeddingRegistry.has(chunk.canonical_id);
      if (!exists) {
        CanonicalEmbeddingRegistry.register(chunk);
      }
      return !exists;
    });

    if (uniqueChunks.length > 0) {
      await Database.governedWrite('knowledge_chunks', uniqueChunks, {
        portalType: uniqueChunks[0].portal_type,
      });
    }

    Telemetry.emit({
      event: 'CONTENT_INGESTED',
      source: 'knowledge',
      portalType: uniqueChunks[0]?.portal_type ?? chunks[0]?.portal_type,
      canonicalId: uniqueChunks[0]?.canonical_id,
      payload: {
        chunk_count: uniqueChunks.length,
        duplicate_count: chunks.length - uniqueChunks.length,
      },
    });

    return {
      indexed: uniqueChunks.length,
      duplicates: chunks.length - uniqueChunks.length,
      portal_type: chunks[0]?.portal_type ?? 'high_school',
    };
  }
}
