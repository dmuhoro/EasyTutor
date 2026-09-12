import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Database, GovernedPayload } from '../../src/infrastructure/database';

const SYNC_QUEUE_KEY = '@easytutor_sync_queue';

export interface SyncTask {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'upsert';
  payload: GovernedPayload;
  timestamp: number;
}

export class SyncEngine {
  private static instance: SyncEngine;
  private isProcessing = false;

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  /**
   * Enqueues a task for synchronization.
   */
  public async enqueue(task: Omit<SyncTask, 'id' | 'timestamp'>): Promise<void> {
    const newTask: SyncTask = {
      ...task,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };

    const queue = await this.getQueue();
    queue.push(newTask);
    await this.saveQueue(queue);

    console.log(`[SYNC] Enqueued task for ${task.table}`);
    this.processQueue(); // Fire and forget
  }

  /**
   * Processes the pending sync queue if online.
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('[SYNC] Offline. Waiting for connection...');
      return;
    }

    this.isProcessing = true;
    console.log('[SYNC] Processing queue...');

    try {
      let queue = await this.getQueue();
      while (queue.length > 0) {
        const task = queue[0];
        const error = await this.executeTask(task);

        if (error) {
          console.error(`[SYNC] Task failed: ${task.table}`, error);
          // If it's a persistent error, we might want to discard it or move it to a dead-letter queue
          // For now, we retry later by stopping the process
          break;
        }

        queue.shift(); // Remove completed task
        await this.saveQueue(queue);
      }
    } finally {
      this.isProcessing = false;
      console.log('[SYNC] Queue processing finished.');
    }
  }

  private async executeTask(task: SyncTask): Promise<Error | null> {
    try {
      await Database.governedWrite(task.table, task.payload, {
        action: task.action === 'insert' ? 'insert' : 'upsert',
      });
      return null;
    } catch (err) {
      return err instanceof Error ? err : new Error(String(err));
    }
  }

  private async getQueue(): Promise<SyncTask[]> {
    const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private async saveQueue(queue: SyncTask[]): Promise<void> {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }
}

export const globalSyncEngine = SyncEngine.getInstance();
