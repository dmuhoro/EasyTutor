import { RevenueSignal } from './contracts';

export class RevenueOperationsCoordinator {
  coordinate(signals: RevenueSignal[]): { totalRevenue: number; totalCost: number; margin: number } {
    const totalRevenue = signals.reduce((sum, s) => sum + s.revenue, 0);
    const totalCost = signals.reduce((sum, s) => sum + s.cost, 0);
    const margin = totalRevenue === 0 ? 0 : (totalRevenue - totalCost) / totalRevenue;
    return { totalRevenue, totalCost, margin };
  }
}

export class InfrastructureMonetizationEngine {
  monetize(input: { activeTenants: number; arpu: number }): { mrr: number } {
    return { mrr: input.activeTenants * input.arpu };
  }
}

export class DeploymentProfitabilityAnalyzer {
  analyze(input: { deploymentRevenue: number; deploymentCost: number }): { profitable: boolean; profit: number } {
    const profit = input.deploymentRevenue - input.deploymentCost;
    return { profitable: profit > 0, profit };
  }
}

export class SubscriptionExpansionPredictor {
  predict(input: { expansionEvents: number; baseTenants: number }): { expansionRate: number } {
    return { expansionRate: input.baseTenants === 0 ? 0 : input.expansionEvents / input.baseTenants };
  }
}

export class MultiTenantGrowthForecaster {
  forecast(input: { currentTenants: number; monthlyGrowthRate: number; months: number }): { projectedTenants: number } {
    const projectedTenants = Math.round(input.currentTenants * Math.pow(1 + input.monthlyGrowthRate, input.months));
    return { projectedTenants };
  }
}
