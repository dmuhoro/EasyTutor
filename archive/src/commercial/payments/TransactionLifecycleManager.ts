/**
 * TRANSACTION LIFECYCLE MANAGER
 *
 * Manages the complete lifecycle of transactions from initiation to reconciliation:
 * - State machine enforcement
 * - Event tracking
 * - State recovery
 * - Audit trail maintenance
 */

import { Transaction, TransactionLifecycle } from './paymentContracts';

export type TransactionStage = 'initiated' | 'validated' | 'authorized' | 'captured' | 'settled' | 'reconciled' | 'failed';

export interface StateTransition {
  from: TransactionStage;
  to: TransactionStage;
  timestamp: string;
  reason?: string;
}

export class TransactionLifecycleManager {
  private lifecycles: Map<string, TransactionLifecycle> = new Map();
  private stateTransitionHandlers: Map<string, ((tx: Transaction) => Promise<void>)[]> = new Map();

  async initializeTransaction(transaction: Transaction): Promise<TransactionLifecycle> {
    const lifecycle: TransactionLifecycle = {
      transaction_id: transaction.transaction_id,
      current_stage: 'initiated',
      state_transitions: [
        {
          from: 'initiated' as any,
          to: 'initiated',
          timestamp: new Date().toISOString(),
        },
      ],
      last_updated: new Date().toISOString(),
    };

    this.lifecycles.set(transaction.transaction_id, lifecycle);
    return lifecycle;
  }

  async transitionTo(
    transaction_id: string,
    targetStage: TransactionStage,
    reason?: string
  ): Promise<TransactionLifecycle> {
    const lifecycle = this.lifecycles.get(transaction_id);
    if (!lifecycle) {
      throw new Error(`Transaction ${transaction_id} not found`);
    }

    if (!this.isValidTransition(lifecycle.current_stage, targetStage)) {
      throw new Error(
        `Invalid transition from ${lifecycle.current_stage} to ${targetStage}`
      );
    }

    lifecycle.state_transitions.push({
      from: lifecycle.current_stage,
      to: targetStage,
      timestamp: new Date().toISOString(),
      reason,
    });

    lifecycle.current_stage = targetStage;
    lifecycle.last_updated = new Date().toISOString();

    // Execute handlers
    const handlers = this.stateTransitionHandlers.get(`${lifecycle.current_stage}`) || [];
    await Promise.all(handlers.map(h => h({ transaction_id } as Transaction)));

    return lifecycle;
  }

  private isValidTransition(from: TransactionStage, to: TransactionStage): boolean {
    const validTransitions: Record<TransactionStage, TransactionStage[]> = {
      initiated: ['validated', 'failed'],
      validated: ['authorized', 'failed'],
      authorized: ['captured', 'failed'],
      captured: ['settled', 'failed'],
      settled: ['reconciled', 'failed'],
      reconciled: ['reconciled'],
      failed: ['initiated'],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  registerTransitionHandler(stage: TransactionStage, handler: (tx: Transaction) => Promise<void>): void {
    if (!this.stateTransitionHandlers.has(stage)) {
      this.stateTransitionHandlers.set(stage, []);
    }
    this.stateTransitionHandlers.get(stage)!.push(handler);
  }

  getLifecycle(transaction_id: string): TransactionLifecycle | undefined {
    return this.lifecycles.get(transaction_id);
  }

  recoverFailedTransaction(transaction_id: string): TransactionLifecycle {
    const lifecycle = this.lifecycles.get(transaction_id);
    if (!lifecycle) throw new Error('Transaction not found');

    // Rewind to last successful state
    const lastSuccessful = lifecycle.state_transitions
      .filter(t => t.to !== 'failed')
      .slice(-1)[0];

    if (!lastSuccessful) throw new Error('No recovery point found');

    lifecycle.current_stage = lastSuccessful.to as TransactionStage;
    return lifecycle;
  }
}
