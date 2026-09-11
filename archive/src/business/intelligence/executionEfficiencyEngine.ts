import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { Database } from '../../infrastructure/database';

/**
 * EXECUTION EFFICIENCY ENGINE
 * 
 * Calculates efficiency scores for teams and individual operators based on execution speed and quality.
 */
export class ExecutionEfficiencyEngine {
  static async calculateEfficiency(context: TenantContext, operatorId: string): Promise<number> {
    const query = Database.governedQuery({
      table: 'operational_tasks',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    const { data, error } = await (query as any).eq('assigned_to', operatorId).eq('status', 'completed');
    if (error || !data || data.length === 0) return 0;

    // Calculate average completion time
    const totalDuration = data.reduce((acc: number, task: any) => {
      const duration = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime();
      return acc + duration;
    }, 0);

    const avgDurationHours = (totalDuration / data.length) / (1000 * 60 * 60);
    
    // Baseline: 4 hours per task = 100% efficiency
    const score = Math.max(0, 100 * (4 / avgDurationHours));
    return Math.min(100, score);
  }
}
