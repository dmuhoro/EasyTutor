/**
 * USAGE PRICING ENGINE
 * 
 * Defines the unit pricing for various cognitive operations on the platform.
 */
export class UsagePricingEngine {
  private static pricingTable: Record<string, number> = {
    'inference': 0.002,
    'retrieval': 0.0005,
    'reasoning': 0.005,
    'generation': 0.003,
    'indexing': 0.0001,
    'generic': 0.001
  };

  static getCostForOperation(operation: string): number {
    return this.pricingTable[operation] || this.pricingTable['generic'];
  }

  static getPricingTable(): Record<string, number> {
    return { ...this.pricingTable };
  }
}
