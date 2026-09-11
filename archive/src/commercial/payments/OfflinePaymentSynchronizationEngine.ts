/**
 * OFFLINE PAYMENT SYNCHRONIZATION ENGINE
 *
 * Handles offline payment sync for low-connectivity environments:
 * - Queue management
 * - Sync scheduling
 * - Conflict resolution
 * - Data integrity
 */

import { OfflinePaymentBuffer, MobileMoneyTransaction } from './paymentContracts';

export interface SyncReport {
  buffer_id: string;
  transactions_synced: number;
  transactions_failed: number;
  bytes_transferred: number;
  sync_duration_ms: number;
  sync_timestamp: string;
}

export class OfflinePaymentSynchronizationEngine {
  private buffers: Map<string, OfflinePaymentBuffer> = new Map();
  private syncReports: Map<string, SyncReport[]> = new Map();
  private networkAvailable = true;

  createBuffer(wallet_id: string): OfflinePaymentBuffer {
    const buffer: OfflinePaymentBuffer = {
      buffer_id: `BUFFER-${Date.now()}`,
      wallet_id,
      queued_transactions: [],
      buffer_size_bytes: 0,
      last_synced: new Date().toISOString(),
      is_syncing: false,
    };

    this.buffers.set(buffer.buffer_id, buffer);
    this.syncReports.set(buffer.buffer_id, []);
    return buffer;
  }

  async queueTransaction(buffer_id: string, transaction: MobileMoneyTransaction): Promise<void> {
    const buffer = this.buffers.get(buffer_id);
    if (!buffer) throw new Error(`Buffer ${buffer_id} not found`);

    // Estimate transaction size (simplified)
    const txSize = JSON.stringify(transaction).length;

    // Check buffer size limit (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (buffer.buffer_size_bytes + txSize > maxSize) {
      throw new Error('Buffer size limit exceeded');
    }

    buffer.queued_transactions.push(transaction);
    buffer.buffer_size_bytes += txSize;
  }

  async syncBuffer(buffer_id: string): Promise<SyncReport> {
    const buffer = this.buffers.get(buffer_id);
    if (!buffer) throw new Error(`Buffer ${buffer_id} not found`);

    if (!this.networkAvailable) {
      throw new Error('Network unavailable for sync');
    }

    buffer.is_syncing = true;
    const startTime = Date.now();
    let transactionsSynced = 0;
    let transactionsFailed = 0;

    // Simulate sync process
    for (const tx of buffer.queued_transactions) {
      try {
        // Simulate network transmission
        const success = Math.random() > 0.05; // 95% success rate

        if (success) {
          transactionsSynced++;
        } else {
          transactionsFailed++;
        }
      } catch {
        transactionsFailed++;
      }
    }

    // Clear successfully synced transactions
    buffer.queued_transactions = buffer.queued_transactions.slice(transactionsFailed);
    buffer.buffer_size_bytes = JSON.stringify(buffer.queued_transactions).length;
    buffer.is_syncing = false;
    buffer.last_synced = new Date().toISOString();

    const syncDuration = Date.now() - startTime;
    const report: SyncReport = {
      buffer_id,
      transactions_synced: transactionsSynced,
      transactions_failed: transactionsFailed,
      bytes_transferred: transactionsSynced * 500, // Estimate 500 bytes per tx
      sync_duration_ms: syncDuration,
      sync_timestamp: new Date().toISOString(),
    };

    const reports = this.syncReports.get(buffer_id) || [];
    reports.push(report);
    this.syncReports.set(buffer_id, reports);

    return report;
  }

  async schedulePeriodicSync(buffer_id: string, intervalMs: number = 300000): Promise<void> {
    // Schedule sync every 5 minutes by default
    setInterval(async () => {
      const buffer = this.buffers.get(buffer_id);
      if (buffer && buffer.queued_transactions.length > 0 && this.networkAvailable) {
        try {
          await this.syncBuffer(buffer_id);
        } catch (error) {
          console.error(`Sync failed for buffer ${buffer_id}:`, error);
        }
      }
    }, intervalMs);
  }

  setNetworkStatus(available: boolean): void {
    this.networkAvailable = available;
  }

  getBufferStatus(buffer_id: string): OfflinePaymentBuffer | undefined {
    return this.buffers.get(buffer_id);
  }

  getSyncHistory(buffer_id: string, limit: number = 50): SyncReport[] {
    const reports = this.syncReports.get(buffer_id) || [];
    return reports.slice(-limit);
  }

  getQueuedTransactionCount(buffer_id: string): number {
    const buffer = this.buffers.get(buffer_id);
    return buffer?.queued_transactions.length ?? 0;
  }

  clearBuffer(buffer_id: string): void {
    const buffer = this.buffers.get(buffer_id);
    if (buffer) {
      buffer.queued_transactions = [];
      buffer.buffer_size_bytes = 0;
    }
  }
}
