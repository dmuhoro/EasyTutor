import { WorkflowMemoryEngine } from '../../business/workflowMemoryEngine';
import { TenantContext } from '../../infrastructure/platform/tenantContracts';

/**
 * CONTRACT MEMORY SYSTEM (FreelancerOS)
 * 
 * Provides a cognitive memory layer for freelancer contracts, agreements, and client preferences.
 */
export class ContractMemorySystem {
  static async storeContractFact(context: TenantContext, projectId: string, fact: string): Promise<void> {
    await WorkflowMemoryEngine.storeFact(context, projectId, 'contract_provision', fact);
  }

  static async getContractHistory(context: TenantContext, projectId: string): Promise<any[]> {
    return WorkflowMemoryEngine.getWorkflowMemory(context, projectId);
  }

  static async recordClientPreference(context: TenantContext, clientId: string, preference: string): Promise<void> {
    await WorkflowMemoryEngine.storeFact(context, clientId, 'client_preference', preference);
  }
}
