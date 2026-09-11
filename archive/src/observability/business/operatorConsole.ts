import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { OperationalAnalyticsEngine } from '../../business/intelligence/operationalAnalyticsEngine';
import { BottleneckDetectionEngine } from '../../business/intelligence/bottleneckDetectionEngine';

/**
 * OPERATOR CONSOLE
 * 
 * Provides a high-level operational overview for business operators.
 */
export class OperatorConsole {
  static async getOverview(context: TenantContext): Promise<any> {
    const summary = await OperationalAnalyticsEngine.getOperationalSummary(context);
    const bottlenecks = await BottleneckDetectionEngine.detectBottlenecks(context);

    return {
      business_health: summary.completion_ratio > 0.7 ? 'HEALTHY' : 'NEEDS_ATTENTION',
      active_workflows: summary.active_workflows,
      stalled_tasks: bottlenecks.length,
      efficiency_summary: summary,
      timestamp: new Date().toISOString()
    };
  }
}
