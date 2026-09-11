import { PortalType } from '../../types/canonical';
import { ChunkGovernance } from './chunkGovernance';
import { TaxonomyMapper } from './taxonomyMapper';

export interface CanonicalChunkMetadata {
  canonical_id: string;
  portal_type: PortalType;
  subject_id: string;
  topic_id: string;
  mastery_level: number;
  semantic_tags: string[];
  retrieval_priority: number;
  source_type: string;
  ingestion_timestamp: string;
  taxonomy_path: string[];
  [key: string]: any;
}

export interface CanonicalChunk extends CanonicalChunkMetadata {
  content: string;
}

export interface CanonicalChunkerConfig {
  chunkSize: number;
  chunkOverlap: number;
}

export class CanonicalChunker {
  constructor(private readonly config: CanonicalChunkerConfig = { chunkSize: 512, chunkOverlap: 64 }) {}

  split(
    text: string,
    metadata: Omit<CanonicalChunkMetadata, 'canonical_id' | 'ingestion_timestamp' | 'taxonomy_path'>,
  ): CanonicalChunk[] {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);

    const path = TaxonomyMapper.mapToTaxonomyPath(metadata.portal_type, metadata.subject_id, metadata.topic_id);
    const canonicalChunks: CanonicalChunk[] = [];

    let chunkIndex = 0;
    for (const entry of paragraphs) {
      const sentences = entry.split(/(?<=[.?!])\s+/);
      let window = '';
      for (const sentence of sentences) {
        const candidate = window ? `${window} ${sentence}` : sentence;
        if (candidate.length > this.config.chunkSize && window.length > 0) {
          canonicalChunks.push(this.buildChunk(window, metadata, path, ++chunkIndex));
          window = sentence;
        } else {
          window = candidate;
        }
      }

      if (window.trim()) {
        canonicalChunks.push(this.buildChunk(window, metadata, path, ++chunkIndex));
      }
    }

    return canonicalChunks.map(ChunkGovernance.assertCanonicalChunk);
  }

  private buildChunk(
    content: string,
    metadata: Omit<CanonicalChunkMetadata, 'canonical_id' | 'ingestion_timestamp' | 'taxonomy_path'>,
    taxonomy_path: string[],
    index: number,
  ): CanonicalChunk {
    return {
      canonical_id: `CHUNK-${this.getPortalPrefix(metadata.portal_type)}-${metadata.subject_id}-${metadata.topic_id}-${index}`,
      ingestion_timestamp: new Date().toISOString(),
      taxonomy_path,
      content,
      ...metadata,
    } as CanonicalChunk;
  }

  private getPortalPrefix(portalType: PortalType): string {
    switch (portalType) {
      case 'high_school':
        return 'HS';
      case 'university':
        return 'UNI';
      case 'knowledge_explorer':
        return 'KE';
      default:
        return (portalType as string).toUpperCase();
    }
  }
}
