import { Telemetry } from '../../observability/telemetry';

/**
 * QUEUE MANAGER
 * 
 * Manages distributed task queues for cognitive execution workers.
 * Bridges the API gateway with worker nodes.
 */
export class QueueManager {
  private static instance: QueueManager;
  private tasks: any[] = [];

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  async enqueue(task: any): Promise<void> {
    this.tasks.push(task);
    Telemetry.emit({
      event: 'TASK_ENQUEUED',
      source: 'platform',
      operationType: 'queue_operation',
      payload: { task_id: task.id, queue_depth: this.tasks.length }
    });
  }

  async dequeue(): Promise<any | null> {
    const task = this.tasks.shift() || null;
    if (task) {
      Telemetry.emit({
        event: 'TASK_DEQUEUED',
        source: 'platform',
        operationType: 'queue_operation',
        payload: { task_id: task.id, queue_depth: this.tasks.length }
      });
    }
    return task;
  }
}

export const queueManager = QueueManager.getInstance();
