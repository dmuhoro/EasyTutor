/**
 * DEPLOYMENT CONTRACTS
 * 
 * Foundational types for production deployment, cluster management, and failover.
 */

export type NodeStatus = 'healthy' | 'degraded' | 'offline' | 'starting' | 'draining';
export type DeploymentEnvironment = 'production' | 'staging' | 'development';

export interface ClusterNode {
  id: string;
  host: string;
  port: number;
  status: NodeStatus;
  capabilities: string[]; // e.g., ['inference', 'indexing', 'storage']
  load_factor: number; // 0.0 - 1.0
  last_heartbeat: string;
  [key: string]: any;
}

export interface DeploymentConfig {
  environment: DeploymentEnvironment;
  version: string;
  cluster_id: string;
  replicas: number;
  auto_scale: boolean;
  min_nodes: number;
  max_nodes: number;
}

export interface RuntimeHeartbeat {
  node_id: string;
  status: NodeStatus;
  metrics: {
    cpu_usage: number;
    memory_usage: number;
    active_executions: number;
  };
}

export interface FailoverEvent {
  failed_node_id: string;
  recovered_by_id: string;
  timestamp: string;
  workload_count: number;
}
