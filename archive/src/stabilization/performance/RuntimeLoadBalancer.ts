import { DistributedRuntimeRegistry } from '../../infrastructure/deployment/distributedRuntimeRegistry';

/**
 * RUNTIME LOAD BALANCER
 * 
 * Distributes cognitive execution tasks across the cluster to optimize 
 * resource utilization and minimize latency.
 */
export class RuntimeLoadBalancer {
  static async selectOptimalNode(capabilities: string[]): Promise<string> {
    const nodes = await DistributedRuntimeRegistry.getActiveNodes();
    
    // Filter by required capabilities
    const eligibleNodes = nodes.filter(node => 
      capabilities.every(cap => node.capabilities.includes(cap)) &&
      node.status === 'healthy'
    );

    if (eligibleNodes.length === 0) throw new Error('No eligible nodes found for execution');

    // Select node with lowest load factor
    const selected = eligibleNodes.sort((a, b) => a.load_factor - b.load_factor)[0];
    
    console.log(`[LOAD BALANCER] Selected node ${selected.id} (Load: ${selected.load_factor})`);
    return selected.id;
  }
}
