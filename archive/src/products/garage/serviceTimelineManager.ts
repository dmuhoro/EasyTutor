import { Database } from '../../infrastructure/database';
import { TenantContext } from '../../infrastructure/platform/tenantContracts';

/**
 * SERVICE TIMELINE MANAGER (GarageOS)
 * 
 * Provides a historical timeline of all services and repairs performed on a vehicle.
 */
export class ServiceTimelineManager {
  static async recordService(context: TenantContext, vehicleVin: string, serviceDescription: string): Promise<void> {
    await Database.governedWrite('garage_service_history', {
      id: `svc_${Date.now()}`,
      tenant_id: context.tenant_id,
      vehicle_vin: vehicleVin,
      description: serviceDescription,
      timestamp: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }

  static async getVehicleTimeline(context: TenantContext, vehicleVin: string): Promise<any[]> {
    const query = Database.governedQuery({
      table: 'garage_service_history',
      columns: '*',
      portalType: context.portal_type
    });

    const { data } = await (query as any).eq('vehicle_vin', vehicleVin).order('timestamp', { ascending: false });
    return data || [];
  }
}
