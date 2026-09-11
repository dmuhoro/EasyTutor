/**
 * MOBILE WALLET LEDGER
 *
 * Maintains ledger of mobile wallet transactions:
 * - Balance tracking
 * - Transaction history
 * - Reconciliation
 * - Multi-wallet management
 */

import { MobileWalletAccount, MobileMoneyTransaction } from './paymentContracts';

export interface WalletLedgerEntry {
  entry_id: string;
  wallet_id: string;
  transaction_id: string;
  amount: number;
  direction: 'inbound' | 'outbound';
  balance_after: number;
  timestamp: string;
}

export class MobileWalletLedger {
  private wallets: Map<string, MobileWalletAccount> = new Map();
  private ledgerEntries: Map<string, WalletLedgerEntry[]> = new Map();
  private reconciliationLog: Map<string, { last_reconciled: string; status: string }> = new Map();

  registerWallet(wallet: MobileWalletAccount): void {
    this.wallets.set(wallet.wallet_id, wallet);
    this.ledgerEntries.set(wallet.wallet_id, []);
    this.reconciliationLog.set(wallet.wallet_id, {
      last_reconciled: new Date().toISOString(),
      status: 'synced',
    });
  }

  async recordTransaction(wallet_id: string, transaction: MobileMoneyTransaction): Promise<WalletLedgerEntry> {
    const wallet = this.wallets.get(wallet_id);
    if (!wallet) throw new Error(`Wallet ${wallet_id} not found`);

    const currentBalance = wallet.balance;
    const newBalance = transaction.direction === 'inbound' ? currentBalance + transaction.amount : currentBalance - transaction.amount;

    const entry: WalletLedgerEntry = {
      entry_id: `ENTRY-${Date.now()}`,
      wallet_id,
      transaction_id: transaction.mobile_transaction_id,
      amount: transaction.amount,
      direction: transaction.direction,
      balance_after: newBalance,
      timestamp: new Date().toISOString(),
    };

    // Update wallet balance
    wallet.balance = newBalance;
    wallet.last_synced = new Date().toISOString();

    // Add to ledger
    const entries = this.ledgerEntries.get(wallet_id) || [];
    entries.push(entry);
    this.ledgerEntries.set(wallet_id, entries);

    return entry;
  }

  async getBalance(wallet_id: string): Promise<number> {
    const wallet = this.wallets.get(wallet_id);
    return wallet?.balance ?? 0;
  }

  async getTransactionHistory(
    wallet_id: string,
    limit: number = 100
  ): Promise<WalletLedgerEntry[]> {
    const entries = this.ledgerEntries.get(wallet_id) || [];
    return entries.slice(-limit).reverse();
  }

  async reconcileWallet(wallet_id: string, externalBalance: number): Promise<{ reconciled: boolean; discrepancy: number }> {
    const wallet = this.wallets.get(wallet_id);
    if (!wallet) throw new Error(`Wallet ${wallet_id} not found`);

    const discrepancy = wallet.balance - externalBalance;
    const reconciled = Math.abs(discrepancy) < 1; // Allow for rounding errors

    if (reconciled) {
      const log = this.reconciliationLog.get(wallet_id)!;
      log.last_reconciled = new Date().toISOString();
      log.status = 'synced';
    } else {
      const log = this.reconciliationLog.get(wallet_id)!;
      log.status = 'discrepancy_detected';
    }

    return { reconciled, discrepancy };
  }

  getReconciliationStatus(wallet_id: string): { last_reconciled: string; status: string } | undefined {
    return this.reconciliationLog.get(wallet_id);
  }

  getAllWallets(): MobileWalletAccount[] {
    return Array.from(this.wallets.values());
  }

  getWallet(wallet_id: string): MobileWalletAccount | undefined {
    return this.wallets.get(wallet_id);
  }
}
