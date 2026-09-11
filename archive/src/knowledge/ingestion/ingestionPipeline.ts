import { CanonicalChunker, CanonicalChunkMetadata } from './canonicalChunker';
import { KnowledgeValidator } from '../validator';
import { SemanticIndexer } from './semanticIndexer';
import { Telemetry } from '../../observability/telemetry';

export interface IngestionRequest {
  portal_type: CanonicalChunkMetadata['portal_type'];
  subject_id: string;
  topic_id: string;
  mastery_level: number;
  semantic_tags: string[];
  retrieval_priority: number;
  source_type: string;
  raw_text: string;
}

export interface IngestionResult {
  success: boolean;
  indexed: number;
  duplicates: number;
  errors?: string[];
}

export class IngestionPipeline {
  private readonly chunker = new CanonicalChunker({ chunkSize: 400, chunkOverlap: 80 });

  async ingest(request: IngestionRequest): Promise<IngestionResult> {
    const metadata = {
      portal_type: request.portal_type,
      subject_id: request.subject_id,
      topic_id: request.topic_id,
      mastery_level: request.mastery_level,
      semantic_tags: request.semantic_tags,
      retrieval_priority: request.retrieval_priority,
      source_type: request.source_type,
    };

    const chunks = this.chunker.split(request.raw_text, metadata);
    const validatedChunks = [];
    const errors: string[] = [];

    for (const chunk of chunks) {
      const validation = KnowledgeValidator.validate({
        id: chunk.canonical_id,
        title: `${request.subject_id} ${request.topic_id} content`,
        portal_type: chunk.portal_type,
      });

      if (!validation.success) {
        errors.push(validation.error ?? 'Unknown validation failure');
        continue;
      }
      validatedChunks.push(chunk);
    }

    if (validatedChunks.length === 0) {
      Telemetry.emit({
        event: 'CONTENT_INGESTED',
        source: 'knowledge',
        portalType: request.portal_type,
        payload: { success: false, errors },
      });
      return { success: false, indexed: 0, duplicates: 0, errors };
    }

    const indexResult = await SemanticIndexer.indexChunks(validatedChunks);

    return {
      success: true,
      indexed: indexResult.indexed,
      duplicates: indexResult.duplicates,
    };
  }
}
