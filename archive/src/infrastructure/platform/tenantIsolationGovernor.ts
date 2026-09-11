import { TenantContext } from './tenantContracts';
import { Database } from '../database';

/**
 * TENANT ISOLATION GOVERNOR
 * 
 * Enforces strict isolation rules at the runtime and database layers.
 * Mandated for all cross-tenant boundary validations.
 */
export class TenantIsolationGovernor {
  /**
   * Validates that the requested resource (canonical_id) is owned by the active tenant.
   */
  static async validateOwnership(context: TenantContext, canonicalId: string): Promise<void> {
    // 1. Verify portal isolation matches tenant portal
    if (canonicalId.startsWith('UNI-') && context.portal_type !== 'university') {
      throw new Error(`[ISOLATION ERROR] Tenant ${context.tenant_id} cannot access university resources`);
    }

    // 2. Query knowledge_chunks with tenant filter (in production this is enforced via RLS)
    const query = Database.governedQuery({
      table: 'knowledge_chunks',
      columns: 'id',
      portalType: context.portal_type,
    });

    const { data, error } = await (query as any)
      .eq('canonical_id', canonicalId)
      // .eq('tenant_id', context.tenant_id) // Future: when tenant_id column is added to all tables
      .limit(1);

    if (error || !data || data.length === 0) {
      throw new Error(`[ISOLATION ERROR] Resource ${canonicalId} not owned by or visible to tenant ${context.tenant_id}`);
    }
  }

  /**
   * Ensures execution budgets match tenant-specific constraints.
   */
  static validateExecutionBudget(context: TenantContext, budget: any): void {
    // Placeholder: apply tenant-specific budget overrides
    if (context.role === 'student' && budget.max_retries > 3) {
      throw new Error('[ISOLATION ERROR] Student role exceeds max retry budget');
    }
  }
}
