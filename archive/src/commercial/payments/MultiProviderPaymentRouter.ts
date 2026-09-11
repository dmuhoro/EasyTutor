/**
 * MULTI-PROVIDER PAYMENT ROUTER
 *
 * Intelligent routing across multiple payment providers:
 * - Provider selection logic
 * - Load balancing
 * - Failover management
 * - Provider-specific integrations
 */

import { PaymentProvider, CurrencyCode, Transaction, PaymentStatus } from './paymentContracts';

export interface ProviderCapability {
  provider: PaymentProvider;
  supported_currencies: CurrencyCode[];
  min_amount: number;
  max_amount: number;
  processing_time_hours: number;
  success_rate: number;
  fee_percentage: number;
}

export interface RoutingDecision {
  primary_provider: PaymentProvider;
  fallback_providers: PaymentProvider[];
  reason: string;
  estimated_cost: number;
  estimated_processing_time: number;
}

export class MultiProviderPaymentRouter {
  private providers: Map<PaymentProvider, ProviderCapability> = new Map();
  private providerLoads: Map<PaymentProvider, number> = new Map();
  private activeTransactions: Map<string, { provider: PaymentProvider; startedAt: string }> = new Map();

  registerProvider(capability: ProviderCapability): void {
    this.providers.set(capability.provider, capability);
    this.providerLoads.set(capability.provider, 0);
  }

  async routePayment(
    amount: number,
    currency: CurrencyCode,
    preferences?: { preferred_providers?: PaymentProvider[] }
  ): Promise<RoutingDecision> {
    const viable = this.findViableProviders(amount, currency);

    if (viable.length === 0) {
      throw new Error(`No viable providers for ${currency} ${amount}`);
    }

    // Apply preference if specified
    if (preferences?.preferred_providers && preferences.preferred_providers.length > 0) {
      const preferred = viable.filter(p => preferences.preferred_providers!.includes(p.provider));
      if (preferred.length > 0) {
        viable.splice(0, viable.length, ...preferred, ...viable.filter(p => !preferred.includes(p)));
      }
    }

    // Sort by load balancing and success rate
    viable.sort((a, b) => {
      const aLoad = this.providerLoads.get(a.provider) || 0;
      const bLoad = this.providerLoads.get(b.provider) || 0;
      const loadDiff = aLoad - bLoad;

      if (Math.abs(loadDiff) > 10) return loadDiff;
      return b.success_rate - a.success_rate;
    });

    const primary = viable[0];
    const fallbacks = viable.slice(1, 3).map(p => p.provider);

    return {
      primary_provider: primary.provider,
      fallback_providers: fallbacks,
      reason: `Optimal for ${currency} - ${primary.success_rate * 100}% success rate, ${primary.processing_time_hours}h settlement`,
      estimated_cost: amount * (primary.fee_percentage / 100),
      estimated_processing_time: primary.processing_time_hours,
    };
  }

  async processPayment(
    transaction: Transaction,
    decision: RoutingDecision
  ): Promise<{ provider: PaymentProvider; transaction_id: string; status: PaymentStatus }> {
    let provider = decision.primary_provider;
    let attempt = 1;

    while (attempt <= 3) {
      try {
        this.providerLoads.set(provider, (this.providerLoads.get(provider) || 0) + 1);
        this.activeTransactions.set(transaction.transaction_id, {
          provider,
          startedAt: new Date().toISOString(),
        });

        // Simulate provider processing
        const success = Math.random() > 0.05; // 95% success rate

        if (success) {
          this.providerLoads.set(provider, Math.max(0, (this.providerLoads.get(provider) || 1) - 1));
          return {
            provider,
            transaction_id: transaction.transaction_id,
            status: 'completed',
          };
        }

        throw new Error('Provider processing failed');
      } catch (error) {
        this.providerLoads.set(provider, Math.max(0, (this.providerLoads.get(provider) || 1) - 1));

        if (attempt < decision.fallback_providers.length + 1) {
          provider = decision.fallback_providers[attempt - 1];
          attempt++;
        } else {
          throw new Error(`All providers failed for transaction ${transaction.transaction_id}`);
        }
      }
    }

    throw new Error('Payment routing exhausted all options');
  }

  private findViableProviders(amount: number, currency: CurrencyCode): ProviderCapability[] {
    const viable: ProviderCapability[] = [];

    for (const [, capability] of this.providers) {
      if (
        capability.supported_currencies.includes(currency) &&
        amount >= capability.min_amount &&
        amount <= capability.max_amount &&
        capability.success_rate > 0.75
      ) {
        viable.push(capability);
      }
    }

    return viable;
  }

  getProviderStatus(provider: PaymentProvider): { load: number; active_transactions: number } {
    const load = this.providerLoads.get(provider) || 0;
    const active = Array.from(this.activeTransactions.values()).filter(t => t.provider === provider).length;

    return { load, active_transactions: active };
  }

  completeTransaction(transaction_id: string): void {
    this.activeTransactions.delete(transaction_id);
  }
}
