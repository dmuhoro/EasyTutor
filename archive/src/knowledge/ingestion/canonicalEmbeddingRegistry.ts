import { CanonicalChunk } from './canonicalChunker';

interface EmbeddingEntry {
  canonical_id: string;
  vector_namespace: string;
  registered_at: string;
  source_type: string;
}

const registry = new Map<string, EmbeddingEntry>();

export class CanonicalEmbeddingRegistry {
  static register(chunk: CanonicalChunk): EmbeddingEntry {
    const entry: EmbeddingEntry = {
      canonical_id: chunk.canonical_id,
      vector_namespace: `knowledge:${chunk.portal_type}`,
      registered_at: new Date().toISOString(),
      source_type: chunk.source_type,
    };

    registry.set(chunk.canonical_id, entry);
    return entry;
  }

  static get(canonicalId: string): EmbeddingEntry | undefined {
    return registry.get(canonicalId);
  }

  static has(canonicalId: string): boolean {
    return registry.has(canonicalId);
  }

  static getAll(): EmbeddingEntry[] {
    return Array.from(registry.values());
  }
}
