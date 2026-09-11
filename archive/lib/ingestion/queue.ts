import { IngestionWorker, IngestionConfig } from './worker';

export class IngestionQueue {
  private worker: IngestionWorker;
  private queue: Array<{ documentId: string; fileName: string; text: string }> = [];
  private isProcessing = false;

  constructor(config?: Partial<IngestionConfig>) {
    this.worker = new IngestionWorker(config);
  }

  /**
   * Adds a document to the ingestion queue.
   */
  public enqueue(documentId: string, fileName: string, text: string) {
    this.queue.push({ documentId, fileName, text });
    console.log(`[QUEUE] Enqueued: ${fileName} (Queue size: ${this.queue.length})`);
    
    if (!this.isProcessing) {
      this.processNext();
    }
  }

  private async processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift();

    if (item) {
      try {
        await this.worker.ingestDocument(item.documentId, item.fileName, item.text);
      } catch (err) {
        console.error(`[QUEUE ERROR] Failed to process ${item.fileName}`, err);
      }
    }

    // Process next item in queue
    this.processNext();
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}

// Global singleton queue
export const globalIngestionQueue = new IngestionQueue();
