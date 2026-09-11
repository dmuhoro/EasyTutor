import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { WorkflowMemoryEngine } from '../workflowMemoryEngine';

/**
 * VEHICLE DIAGNOSTIC MEMORY
 * 
 * Manages persistent diagnostic history and repair memory for vehicles across service visits.
 */
export class VehicleDiagnosticMemory {
  static async recordDiagnostic(
    context: TenantContext, 
    vin: string, 
    workflowId: string, 
    findings: any
  ): Promise<void> {
    // Store in general workflow memory first
    await WorkflowMemoryEngine.storeFact(context, workflowId, 'diagnostic_findings', findings);
    
    // Also tag as global vehicle history
    await WorkflowMemoryEngine.storeFact(context, `vehicle_${vin}`, `diagnostic_${Date.now()}`, findings);
  }

  static async getVehicleHistory(context: TenantContext, vin: string): Promise<any[]> {
    const memory = await WorkflowMemoryEngine.retrieveMemory(context, `vehicle_${vin}`);
    return Object.entries(memory).map(([key, value]) => ({
      visit_key: key,
      findings: value
    }));
  }
}
