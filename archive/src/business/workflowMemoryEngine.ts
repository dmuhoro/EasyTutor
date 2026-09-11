import { Database } from '../infrastructure/database';
import { TenantContext } from '../infrastructure/platform/tenantContracts';

/**
 * WORKFLOW MEMORY ENGINE
 * 
 * Provides persistent memory and context storage for business workflows.
 * Bridges the gap between transient execution and long-term operational knowledge.
 */
export class WorkflowMemoryEngine {
  static async storeFact(
    context: TenantContext, 
    workflowId: string, 
    key: string, 
    value: any
  ): Promise<void> {
    const memoryNode = {
      workflow_id: workflowId,
      tenant_id: context.tenant_id,
      key,
      value,
      timestamp: new Date().toISOString()
    };

    await Database.governedWrite('workflow_memory', memoryNode, {
      portalType: context.portal_type,
      userId: context.user_id
    });
  }

  static async retrieveMemory(
    context: TenantContext, 
    workflowId: string
  ): Promise<Record<string, any>> {
    const query = Database.governedQuery({
      table: 'workflow_memory',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    const { data, error } = await (query as any).eq('workflow_id', workflowId);
    if (error || !data) return {};

    // Transform to KV map
    return data.reduce((acc: any, item: any) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }

  static async getWorkflowMemory(
    context: TenantContext, 
    workflowId: string
  ): Promise<any[]> {
    const query = Database.governedQuery({
      table: 'workflow_memory',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    const { data } = await (query as any).eq('workflow_id', workflowId).order('timestamp', { ascending: true });
    return data || [];
  }
}
