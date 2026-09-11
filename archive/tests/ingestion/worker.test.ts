import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionWorker } from '../../lib/ingestion/worker';
import { useIngestionStore } from '../../lib/ingestion/ingestionState';

// Mocks
vi.mock('../../lib/embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
}));

vi.mock('../../lib/supabaseOps', () => ({
  getSupabaseClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
  getAuthenticatedUser: vi.fn().mockResolvedValue({ id: 'test-user-uuid' }),
}));

vi.mock('../../lib/performance', () => ({
  measurePerformance: vi.fn().mockImplementation((name, fn) => fn()),
}));

describe('IngestionWorker', () => {
  beforeEach(() => {
    useIngestionStore.setState({ tasks: {} });
  });

  it('successfully ingests a short document', async () => {
    const worker = new IngestionWorker({ batchSize: 2, chunkSize: 100 });
    const text = "This is a test document. It has multiple sentences to test chunking and batching.";
    
    await worker.ingestDocument('doc-123', 'test.txt', text);
    
    const tasks = useIngestionStore.getState().tasks;
    const task = Object.values(tasks)[0];
    
    expect(task.status).toBe('completed');
    expect(task.progress).toBe(100);
    expect(task.fileName).toBe('test.txt');
  });

  it('updates progress during ingestion', async () => {
    const worker = new IngestionWorker({ batchSize: 1, chunkSize: 10 });
    const text = "A very long text that will create many chunks.";
    
    // We don't await so we can check intermediate states if we had a more complex test
    // but for now just check completion
    await worker.ingestDocument('doc-456', 'large.txt', text);
    
    const task = Object.values(useIngestionStore.getState().tasks)[0];
    expect(task.chunksTotal).toBeGreaterThan(1);
    expect(task.status).toBe('completed');
  });
});
