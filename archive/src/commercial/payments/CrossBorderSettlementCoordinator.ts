/**
 * CROSS-BORDER SETTLEMENT COORDINATOR
 *
 * Coordinates settlement across borders:
 * - Multi-corridor settlement
 * - Netting calculations
 * - Settlement confirmation
 * - Dispute resolution
 */

import { CrossBorderTransaction, CurrencyCode } from './paymentContracts';
import { RegionalCurrencyResolver } from './RegionalCurrencyResolver';

export interface SettlementCorridor {
  corridor_id: string;
  from_country: string;
  to_country: string;
  currency_in: CurrencyCode;
  currency_out: CurrencyCode;
  volume_today: number;
  netting_amount: number;
  settlement_schedule: 'immediate' | 'daily' | 'weekly';
}

export interface CrossBorderSettlement {
  settlement_id: string;
  corridors: SettlementCorridor[];
  total_volume: number;
  settlement_date: string;
  status: 'pending' | 'processing' | 'confirmed' | 'failed';
  confirmation_timestamp?: string;
}

export class CrossBorderSettlementCoordinator {
  private corridors: Map<string, SettlementCorridor> = new Map();
  private settlements: Map<string, CrossBorderSettlement> = new Map();
  private currencyResolver: RegionalCurrencyResolver;
  private disputeLog: Array<{ transaction_id: string; reason: string; status: string }> = [];

  constructor(currencyResolver: RegionalCurrencyResolver) {
    this.currencyResolver = currencyResolver;
  }

  registerCorridor(
    fromCountry: string,
    toCountry: string,
    currencyIn: CurrencyCode,
    currencyOut: CurrencyCode,
    schedule: 'immediate' | 'daily' | 'weekly' = 'daily'
  ): SettlementCorridor {
    const corridorId = `${fromCountry}-${toCountry}`;
    const corridor: SettlementCorridor = {
      corridor_id: corridorId,
      from_country: fromCountry,
      to_country: toCountry,
      currency_in: currencyIn,
      currency_out: currencyOut,
      volume_today: 0,
      netting_amount: 0,
      settlement_schedule: schedule,
    };

    this.corridors.set(corridorId, corridor);
    return corridor;
  }

  async addTransactionToCorridor(
    corridorId: string,
    transaction: CrossBorderTransaction
  ): Promise<void> {
    const corridor = this.corridors.get(corridorId);
    if (!corridor) throw new Error(`Corridor ${corridorId} not found`);

    corridor.volume_today += transaction.originating_amount;
    corridor.netting_amount += transaction.originating_amount * transaction.exchange_rate_used;
  }

  async settleCorridors(schedule?: 'immediate' | 'daily' | 'weekly'): Promise<CrossBorderSettlement> {
    const settleDate = schedule === 'immediate' ? new Date().toISOString() : this.getNextSettlementDate(schedule);

    const applicableCorridors = Array.from(this.corridors.values()).filter(c => {
      if (schedule) return c.settlement_schedule === schedule;
      return c.volume_today > 0;
    });

    if (applicableCorridors.length === 0) {
      throw new Error('No corridors available for settlement');
    }

    const settlement: CrossBorderSettlement = {
      settlement_id: `SETTLEMENT-${Date.now()}`,
      corridors: applicableCorridors,
      total_volume: applicableCorridors.reduce((sum, c) => sum + c.volume_today, 0),
      settlement_date: settleDate,
      status: 'pending',
    };

    this.settlements.set(settlement.settlement_id, settlement);

    // Reset corridor volumes after settlement
    for (const corridor of applicableCorridors) {
      corridor.volume_today = 0;
      corridor.netting_amount = 0;
    }

    return settlement;
  }

  async confirmSettlement(settlement_id: string): Promise<CrossBorderSettlement> {
    const settlement = this.settlements.get(settlement_id);
    if (!settlement) throw new Error(`Settlement ${settlement_id} not found`);

    settlement.status = 'confirmed';
    settlement.confirmation_timestamp = new Date().toISOString();

    return settlement;
  }

  async calculateNetting(corridorId: string): Promise<number> {
    const corridor = this.corridors.get(corridorId);
    if (!corridor) throw new Error(`Corridor ${corridorId} not found`);

    // Convert all amounts to common currency for netting
    const rate = (
      await this.currencyResolver.getExchangeRate(corridor.currency_in, corridor.currency_out)
    ).rate;

    return corridor.volume_today * rate;
  }

  async resolveSingleDispute(
    transaction_id: string,
    reason: string
  ): Promise<{ resolution: string; status: string }> {
    // Add to dispute log
    this.disputeLog.push({
      transaction_id,
      reason,
      status: 'under_review',
    });

    // Simulate dispute resolution
    const resolution = reason.includes('amount')
      ? 'amount_verified_and_corrected'
      : 'payment_reprocessed';

    return {
      resolution,
      status: 'resolved',
    };
  }

  private getNextSettlementDate(schedule?: string): string {
    const now = new Date();

    if (schedule === 'daily') {
      now.setDate(now.getDate() + 1);
      now.setHours(0, 0, 0, 0);
    } else if (schedule === 'weekly') {
      const daysToFriday = (5 - now.getDay() + 7) % 7 || 7;
      now.setDate(now.getDate() + daysToFriday);
      now.setHours(0, 0, 0, 0);
    }

    return now.toISOString();
  }

  getCorridor(corridorId: string): SettlementCorridor | undefined {
    return this.corridors.get(corridorId);
  }

  getSettlement(settlement_id: string): CrossBorderSettlement | undefined {
    return this.settlements.get(settlement_id);
  }

  getDisputeHistory(): Array<{ transaction_id: string; reason: string; status: string }> {
    return this.disputeLog;
  }
}
