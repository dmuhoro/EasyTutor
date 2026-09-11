import { DistributedRuntimeRegistry } from '../../infrastructure/deployment/distributedRuntimeRegistry';
import { RuntimeHealthMonitor } from '../../runtime/runtimeHealthMonitor';

/**
 * PLATFORM OPERATIONS DASHBOARD
 * 
 * Provides a unified operational view of the entire cognitive platform cluster.
 */
export class PlatformOpsDashboard {
  static async getClusterStatus(): Promise<any> {
    const nodes = await DistributedRuntimeRegistry.getActiveNodes();
    const systemHealth = await RuntimeHealthMonitor.getInstance().getStatus();

    return {
      cluster_health: systemHealth.healthy ? 'STABLE' : 'UNSTABLE',
      active_node_count: nodes.length,
      node_distribution: nodes.map(n => ({
        id: n.id,
        load: n.load_factor,
        status: n.status
      })),
      timestamp: new Date().toISOString()
    };
  }
}
