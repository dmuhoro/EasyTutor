import { generateEmbedding } from '../embeddings';
import { SemanticChunker, TextChunk } from '../chunking';
import { getSupabaseClient, getAuthenticatedUser } from '../supabaseOps';
import { processInBatches } from './batching';
import { useIngestionStore } from './ingestionState';
import { measurePerformance } from '../performance';
import { useMetricsStore } from '../../observability/metrics';

export interface IngestionConfig {
  chunkSize: number;
  chunkOverlap: number;
  batchSize: number;
}

const DEFAULT_CONFIG: IngestionConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  batchSize: 10,
};

export class IngestionWorker {
  private config: IngestionConfig;

  constructor(config: Partial<IngestionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Processes a document text into the vector database.
   */
  public async ingestDocument(
    documentId: string,
    fileName: string,
    text: string
  ): Promise<void> {
    const store = useIngestionStore.getState();
    const taskId = `ingest_${documentId}_${Date.now()}`;
    const startTime = Date.now();

    try {
      console.log(`[INGESTION] Starting: ${fileName}`, { documentId });
      store.setTask(taskId, { id: taskId, fileName, status: 'processing', progress: 5 });

      // 1. Semantic Chunking
      const chunker = new SemanticChunker({
        chunkSize: this.config.chunkSize,
        chunkOverlap: this.config.chunkOverlap,
      });
      
      const chunks = await measurePerformance('CHUNK_TEXT', async () => {
        return chunker.createChunks(text);
      });

      const totalChunks = chunks.length;
      store.setTask(taskId, { chunksTotal: totalChunks, chunksProcessed: 0, progress: 10 });

      // 2. Process in Batches (Embedding + Database Insert)
      const supabase = getSupabaseClient();
      const user = await getAuthenticatedUser();

      await processInBatches<TextChunk, any>(chunks, this.config.batchSize, async (batch: TextChunk[]) => {
        // Generate embeddings for the batch
        // Note: generating individually to keep it simple, but ideally bulk embedding if supported
        const records = await Promise.all(
          batch.map(async (chunk: TextChunk) => {
            const embedding = await generateEmbedding(chunk.content);
            return {
              document_id: documentId,
              user_id: user.id,
              content: chunk.content,
              embedding,
              metadata: {
                ...chunk.metadata,
                file_name: fileName,
              },
            };
          })
        );

        // Bulk insert batch into Supabase
        const { error } = await supabase.from('document_chunks').insert(records);

        if (error) {
          throw new Error(`Failed to insert batch: ${error.message}`);
        }

        // Update progress
        const currentTask = useIngestionStore.getState().tasks[taskId];
        const processed = (currentTask.chunksProcessed || 0) + batch.length;
        const progress = Math.min(10 + Math.floor((processed / totalChunks) * 90), 99);
        
        store.setTask(taskId, { chunksProcessed: processed, progress });

        return records;
      });

      store.setTask(taskId, { status: 'completed', progress: 100 });
      console.log(`[INGESTION] Completed: ${fileName}`);

      // Record metrics
      useMetricsStore.getState().recordMetric('INGESTION_CHUNK_COUNT', totalChunks, { fileName });
      useMetricsStore.getState().recordMetric('INGESTION_TOTAL_TIME', Date.now() - startTime, { fileName });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[INGESTION ERROR] ${fileName}`, err);
      store.setTask(taskId, { status: 'failed', error: errorMessage });
      throw err;
    }
  }
}
