/**
 * PAYMENT ORCHESTRATION ENGINE
 *
 * Routes transactions through optimal payment providers based on:
 * - Currency and amount
 * - Provider availability and success rates
 * - Geographic location
 * - Cost optimization
 */

import { Transaction, PaymentRoute, PaymentProvider, CurrencyCode } from './paymentContracts';

export interface RoutingDecision {
  recommended_provider: PaymentProvider;
  alternative_providers: PaymentProvider[];
  estimated_fee: number;
  estimated_settlement_time: number;
  confidence_score: number;
}

export class PaymentOrchestrationEngine {
  private routes: Map<string, PaymentRoute> = new Map();
  private providerMetrics: Map<PaymentProvider, { success_rate: number; latency_ms: number }> = new Map();

  async routeTransaction(transaction: Transaction): Promise<RoutingDecision> {
    const routeKey = `${transaction.currency}_${Math.floor(transaction.amount / 1000)}`;
    const availableRoutes = await this.findViableRoutes(transaction.currency, transaction.amount);

    if (availableRoutes.length === 0) {
      throw new Error(`No payment routes available for ${transaction.currency} ${transaction.amount}`);
    }

    const optimalRoute = this.selectOptimalRoute(availableRoutes, transaction.amount);
    const alternatives = availableRoutes
      .filter(r => r.providers[0] !== optimalRoute.providers[0])
      .slice(0, 2)
      .map(r => r.providers[0]);

    return {
      recommended_provider: optimalRoute.providers[0],
      alternative_providers: alternatives,
      estimated_fee: transaction.amount * optimalRoute.fees_percentage,
      estimated_settlement_time: optimalRoute.avg_settlement_time_hours,
      confidence_score: optimalRoute.success_rate,
    };
  }

  private async findViableRoutes(currency: CurrencyCode, amount: number): Promise<PaymentRoute[]> {
    const viable: PaymentRoute[] = [];
    for (const [, route] of this.routes) {
      if (
        route.currency === currency &&
        amount >= route.min_amount &&
        amount <= route.max_amount &&
        route.success_rate > 0.8
      ) {
        viable.push(route);
      }
    }
    return viable.sort((a, b) => b.success_rate - a.success_rate);
  }

  private selectOptimalRoute(routes: PaymentRoute[], amount: number): PaymentRoute {
    return routes.reduce((best, current) => {
      const bestScore = best.success_rate - best.fees_percentage * 0.1;
      const currentScore = current.success_rate - current.fees_percentage * 0.1;
      return currentScore > bestScore ? current : best;
    });
  }

  registerRoute(route: PaymentRoute): void {
    const key = `${route.currency}_${route.providers[0]}`;
    this.routes.set(key, route);
  }

  updateProviderMetrics(provider: PaymentProvider, success_rate: number, latency_ms: number): void {
    this.providerMetrics.set(provider, { success_rate, latency_ms });
  }
}
