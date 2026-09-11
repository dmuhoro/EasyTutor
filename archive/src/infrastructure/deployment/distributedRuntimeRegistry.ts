import { ClusterNode, NodeStatus } from './deploymentContracts';
import { Database } from '../database';

/**
 * DISTRIBUTED RUNTIME REGISTRY
 * 
 * Provides a centralized registry for all active cognitive runtimes in the cluster.
 * Enables service discovery and node status tracking.
 */
export class DistributedRuntimeRegistry {
  static async registerNode(node: ClusterNode): Promise<void> {
    await Database.governedWrite('cluster_nodes', node, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: 'high_school' // Default infrastructure portal
    });
  }

  static async getActiveNodes(): Promise<ClusterNode[]> {
    const query = Database.governedQuery({
      table: 'cluster_nodes',
      columns: '*',
      portalType: 'high_school'
    });

    const { data } = await (query as any).eq('status', 'healthy');
    return data || [];
  }

  static async updateNodeStatus(nodeId: string, status: NodeStatus): Promise<void> {
    await Database.governedWrite('cluster_nodes', { id: nodeId, status, last_heartbeat: new Date().toISOString() }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: 'high_school'
    });
  }
}
