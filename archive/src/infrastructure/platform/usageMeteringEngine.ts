import { cognitiveMetricsEngine } from '../../observability/cognitiveMetricsEngine';
import { TenantContext } from './tenantContracts';

/**
 * USAGE METERING ENGINE
 * 
 * Tracks cognitive resource consumption (tokens, latency, agent cycles)
 * at the tenant level for billing and quota enforcement.
 */
export class UsageMeteringEngine {
  async recordUsage(
    context: TenantContext, 
    metric: 'tokens' | 'execution_cycles' | 'latency' | 'storage', 
    amount: number
  ): Promise<void> {
    const key = `usage:${context.tenant_id}:${metric}`;
    
    // Record to global metrics engine for live monitoring
    cognitiveMetricsEngine.record(key, amount);
    
    // In production, this would increment a persistent usage counter in the DB
    // e.g. await Database.incrementUsage(context.tenant_id, metric, amount);
    
    console.log(`[METERING] Recorded ${amount} ${metric} for tenant ${context.tenant_id}`);
  }

  async checkQuota(context: TenantContext, metric: string): Promise<boolean> {
    // Mock quota check
    return true;
  }
}

export const usageMeteringEngine = new UsageMeteringEngine();
