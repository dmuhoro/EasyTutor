import { Amount } from '../../types/commerce';

export class FXOptimizationEngine {
  /**
   * Mock exchange rates. In production, this would call an FX provider API.
   */
  private static MOCK_RATES: Record<string, number> = {
    'USD_KES': 129.50,
    'KES_UGX': 28.40,
    'USD_NGN': 1600.00,
    'NGN_KES': 0.08,
  };

  /**
   * Converts an amount from one currency to another with optimization logic.
   */
  static convert(amount: Amount, targetCurrency: string): Amount {
    if (amount.currency === targetCurrency) return amount;

    const pair = `${amount.currency}_${targetCurrency}`;
    const rate = this.MOCK_RATES[pair];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${pair}`);
    }

    // Apply a small margin (e.g., 1.5%) for operational costs
    const margin = 0.015;
    const optimizedRate = rate * (1 - margin);

    return {
      value: amount.value * optimizedRate,
      currency: targetCurrency
    };
  }

  /**
   * Gets the current mid-market rate for a currency pair.
   */
  static getMidMarketRate(from: string, to: string): number {
    return this.MOCK_RATES[`${from}_${to}`] || 1;
  }
}
