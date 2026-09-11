/**
 * SETTLEMENT VERIFICATION ENGINE
 *
 * Verifies settlement batches and reconciles transactions:
 * - Batch verification
 * - Hash verification
 * - Reconciliation
 * - Dispute resolution
 */

import { Settlement, Transaction } from './paymentContracts';
import * as crypto from 'crypto';

export interface SettlementVerification {
  settlement_id: string;
  verified: boolean;
  transaction_count: number;
  verified_amount: number;
  discrepancies: Array<{ transaction_id: string; expected: number; actual: number }>;
  verification_timestamp: string;
}

export class SettlementVerificationEngine {
  private verifiedSettlements: Map<string, SettlementVerification> = new Map();
  private transactionRegistry: Map<string, Transaction> = new Map();

  async verifySettlement(settlement: Settlement): Promise<SettlementVerification> {
    const discrepancies: Array<{ transaction_id: string; expected: number; actual: number }> = [];
    let verifiedAmount = 0;

    for (const txId of settlement.transactions) {
      const transaction = this.transactionRegistry.get(txId);
      if (!transaction) {
        discrepancies.push({ transaction_id: txId, expected: 0, actual: 0 });
        continue;
      }

      if (transaction.amount === settlement.total_amount / settlement.transactions.length) {
        verifiedAmount += transaction.amount;
      } else {
        discrepancies.push({
          transaction_id: txId,
          expected: transaction.amount,
          actual: settlement.total_amount / settlement.transactions.length,
        });
      }
    }

    const verification: SettlementVerification = {
      settlement_id: settlement.settlement_id,
      verified: discrepancies.length === 0,
      transaction_count: settlement.transactions.length,
      verified_amount: verifiedAmount,
      discrepancies,
      verification_timestamp: new Date().toISOString(),
    };

    this.verifiedSettlements.set(settlement.settlement_id, verification);
    return verification;
  }

  generateSettlementHash(settlement: Settlement): string {
    const data = JSON.stringify({
      transactions: settlement.transactions.sort(),
      amount: settlement.total_amount,
      currency: settlement.currency,
      provider: settlement.provider,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  verifySettlementHash(settlement: Settlement, providedHash: string): boolean {
    const calculatedHash = this.generateSettlementHash(settlement);
    return crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(providedHash));
  }

  async reconcileTransaction(transaction_id: string, settledAmount: number): Promise<boolean> {
    const transaction = this.transactionRegistry.get(transaction_id);
    if (!transaction) return false;

    return transaction.amount === settledAmount;
  }

  registerTransaction(transaction: Transaction): void {
    this.transactionRegistry.set(transaction.transaction_id, transaction);
  }

  getVerification(settlement_id: string): SettlementVerification | undefined {
    return this.verifiedSettlements.get(settlement_id);
  }
}
