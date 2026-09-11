import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionWorker } from '../../lib/ingestion/worker';
import { retrieveRelevantChunks } from '../../lib/retrieval';
import { useIngestionStore } from '../../lib/ingestion/ingestionState';
import { explanationCache } from '../../lib/cache/semanticCache';
import { GovernedRetrievalContext } from '../../src/infrastructure/database';

// Mocks
vi.mock('../../lib/embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
}));

vi.mock('../../lib/supabaseOps', () => ({
  getSupabaseClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        count: vi.fn().mockResolvedValue({ data: 1000, error: null }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ 
      data: Array.from({ length: 10 }).map((_, i) => ({
        content: `Chunk ${i}`,
        similarity: 0.8,
        metadata: { index: i }
      })), 
      error: null 
    }),
  }),
  getAuthenticatedUser: vi.fn().mockResolvedValue({ id: 'stress-user' }),
}));

describe('Real-World Stress Tests', () => {
  beforeEach(() => {
    useIngestionStore.setState({ tasks: {} });
    explanationCache.clear();
  });

  it('handles large document ingestion without crashing', async () => {
    const worker = new IngestionWorker({ batchSize: 50, chunkSize: 500 });
    // Generate ~500KB of text
    const largeText = "Academic content. ".repeat(30000); 
    
    await worker.ingestDocument('doc-large', 'huge_book.pdf', largeText);
    
    const task = Object.values(useIngestionStore.getState().tasks)[0];
    expect(task.status).toBe('completed');
    expect(task.chunksTotal).toBeGreaterThan(100);
  });

  it('performs high-frequency retrieval under simulated load', async () => {
    const queries = Array.from({ length: 50 }).map((_, i) => `Query ${i}`);
    const context: GovernedRetrievalContext = {
      portal_type: 'high_school',
      curriculum_scope: 'KICD_KCSE',
      taxonomy_scope: 'HS-MATH',
      mastery_level: 40,
      user_goal: 'stress retrieval safety test',
      active_path: ['HS-MATH'],
    };
    
    const results = await Promise.all(
      queries.map(q => retrieveRelevantChunks(q, context, { maxChunks: 3 }))
    );
    
    expect(results).toHaveLength(50);
    results.forEach(res => {
      expect(res.length).toBeLessThanOrEqual(3);
    });
  });

  it('verifies cache saturation and eviction', async () => {
    // Explanation cache has limit of 50
    for (let i = 0; i < 60; i++) {
      explanationCache.set(`Prompt ${i}`, `Response ${i}`);
    }
    
    // Check if first items were evicted
    expect(explanationCache.get(`Prompt 0`)).toBeNull();
    // Check if last items are present
    expect(explanationCache.get(`Prompt 59`)).toBe(`Response 59`);
  });
});
