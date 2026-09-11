import { describe, it, expect, vi } from 'vitest';
import { IngestionPipeline } from '../../src/knowledge/ingestion/ingestionPipeline';

vi.mock('../../src/knowledge/ingestion/semanticIndexer', () => ({
  SemanticIndexer: {
    indexChunks: vi.fn(async (chunks) => ({
      indexed: chunks.length,
      duplicates: 0,
    })),
  },
}));

describe('Knowledge Ingestion Pipeline', () => {
  it('generates canonical chunks and indexes them', async () => {
    const pipeline = new IngestionPipeline();
    const result = await pipeline.ingest({
      portal_type: 'high_school',
      subject_id: 'HS-MATH',
      topic_id: 'HS-MATH-ALG',
      mastery_level: 20,
      semantic_tags: ['algebra', 'equations'],
      retrieval_priority: 1,
      source_type: 'document',
      raw_text: 'Linear equations are the basis of algebra. They can be solved using substitution or elimination. Practice with simple examples.',
    });

    expect(result.success).toBe(true);
    expect(result.indexed).toBeGreaterThan(0);
    expect(result.duplicates).toBe(0);
  });
});
