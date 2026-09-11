import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { Database } from '../../infrastructure/database';
import { Telemetry } from '../../observability/telemetry';

/**
 * BOTTLENECK DETECTION ENGINE
 * 
 * Automatically detects stalled or slow-moving business processes across the platform.
 */
export class BottleneckDetectionEngine {
  static async detectBottlenecks(context: TenantContext): Promise<any[]> {
    const query = Database.governedQuery({
      table: 'operational_tasks',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    const { data, error } = await (query as any).eq('status', 'in_progress');
    if (error || !data) return [];

    const now = new Date().getTime();
    const bottlenecks = data.filter((task: any) => {
      const startTime = new Date(task.updated_at).getTime();
      const ageHours = (now - startTime) / (1000 * 60 * 60);
      return ageHours > 24; // Stalled for more than 24 hours
    });

    if (bottlenecks.length > 0) {
      Telemetry.emit({
        event: 'BOTTLENECK_DETECTED',
        source: 'platform',
        operationType: 'operational_intelligence',
        payload: { bottleneck_count: bottlenecks.length }
      });
    }

    return bottlenecks;
  }
}
