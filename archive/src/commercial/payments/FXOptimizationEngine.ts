/**
 * FX OPTIMIZATION ENGINE
 *
 * Optimizes foreign exchange for cross-border transactions:
 * - Rate optimization
 * - Cost minimization
 * - Timing optimization
 * - Forward rate locking
 */

import { CurrencyCode, CrossBorderTransaction } from './paymentContracts';
import { RegionalCurrencyResolver } from './RegionalCurrencyResolver';

export interface FXQuote {
  quote_id: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  source_amount: number;
  destination_amount: number;
  rate: number;
  fee_percentage: number;
  total_cost: number;
  expires_at: string;
  timestamp: string;
}

export interface OptimizationStrategy {
  strategy: 'immediate' | 'batch' | 'time_window' | 'rate_trigger';
  estimated_savings: number;
  execution_time_minutes: number;
}

export class FXOptimizationEngine {
  private currencyResolver: RegionalCurrencyResolver;
  private lockedRates: Map<string, FXQuote> = new Map();
  private rateHistory: Map<string, { rate: number; timestamp: string }[]> = new Map();
  private volatilityThresholds: Map<string, number> = new Map();

  constructor(currencyResolver: RegionalCurrencyResolver) {
    this.currencyResolver = currencyResolver;
  }

  async generateQuote(
    sourceAmount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode
  ): Promise<FXQuote> {
    const rate = (await this.currencyResolver.getExchangeRate(fromCurrency, toCurrency)).rate;
    const feePercentage = this.calculateFee(sourceAmount);
    const fees = sourceAmount * (feePercentage / 100);
    const destinationAmount = (sourceAmount - fees) * rate;

    return {
      quote_id: `QUOTE-${Date.now()}`,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      source_amount: sourceAmount,
      destination_amount: destinationAmount,
      rate,
      fee_percentage: feePercentage,
      total_cost: fees,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      timestamp: new Date().toISOString(),
    };
  }

  async lockRate(quote: FXQuote, duration_hours: number = 24): Promise<FXQuote> {
    const lockedQuote = { ...quote, expires_at: new Date(Date.now() + duration_hours * 3600000).toISOString() };
    this.lockedRates.set(quote.quote_id, lockedQuote);
    return lockedQuote;
  }

  async recommendStrategy(
    sourceAmount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    urgency: 'immediate' | 'flexible'
  ): Promise<OptimizationStrategy> {
    const volatility = await this.getVolatility(fromCurrency, toCurrency);

    // If urgent, process immediately
    if (urgency === 'immediate') {
      return {
        strategy: 'immediate',
        estimated_savings: 0,
        execution_time_minutes: 5,
      };
    }

    // If high volatility, suggest batching with rate triggers
    if (volatility > 2) {
      return {
        strategy: 'rate_trigger',
        estimated_savings: sourceAmount * 0.01,
        execution_time_minutes: 240,
      };
    }

    // If low volatility, suggest time window batching
    return {
      strategy: 'batch',
      estimated_savings: sourceAmount * 0.005,
      execution_time_minutes: 1440,
    };
  }

  private calculateFee(amount: number): number {
    // Progressive fee structure
    if (amount < 1000) return 3;
    if (amount < 10000) return 2.5;
    if (amount < 100000) return 2;
    return 1.5;
  }

  private async getVolatility(from: CurrencyCode, to: CurrencyCode): Promise<number> {
    const rateKey = `${from}_${to}`;
    const history = this.rateHistory.get(rateKey) || [];

    if (history.length < 2) return 0;

    const rates = history.map(h => h.rate);
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);

    return (stdDev / mean) * 100; // Coefficient of variation
  }

  recordHistoricalRate(from: CurrencyCode, to: CurrencyCode, rate: number): void {
    const rateKey = `${from}_${to}`;
    const history = this.rateHistory.get(rateKey) || [];
    history.push({ rate, timestamp: new Date().toISOString() });

    // Keep only last 1000 records
    if (history.length > 1000) {
      history.shift();
    }

    this.rateHistory.set(rateKey, history);
  }

  getLockedRate(quote_id: string): FXQuote | undefined {
    return this.lockedRates.get(quote_id);
  }

  isRateLocked(quote_id: string): boolean {
    const quote = this.lockedRates.get(quote_id);
    if (!quote) return false;

    const expiresAt = new Date(quote.expires_at).getTime();
    return expiresAt > Date.now();
  }
}
