/**
 * RELIABILITY CONTRACTS
 * 
 * Foundational types for ecosystem hardening, failover validation, and execution durability.
 */

export type NodeHealthState = 'healthy' | 'degraded' | 'failed' | 'recovering';
export type ExecutionRecoveryStatus = 'pending' | 'replaying' | 'recovered' | 'failed_recovery';

export interface NodeHealthSnapshot {
  node_id: string;
  timestamp: string;
  state: NodeHealthState;
  active_executions: number;
  memory_usage_mb: number;
  cpu_load: number;
}

export interface DistributedConsensusResult {
  agreed_state: NodeHealthState;
  quorum_reached: boolean;
  participant_nodes: string[];
}

export interface ExecutionCheckpoint {
  checkpoint_id: string;
  trace_id: string;
  tenant_id: string;
  workflow_id: string;
  step_index: number;
  state_snapshot: Record<string, any>;
  timestamp: string;
  is_verified: boolean;
}

export interface ChaosSimulationResult {
  simulation_id: string;
  scenario_type: 'network_partition' | 'worker_crash' | 'overload' | 'tenant_breach';
  system_survived: boolean;
  recovery_time_ms: number;
  data_loss_detected: boolean;
}
