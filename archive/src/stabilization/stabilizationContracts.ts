/**
 * STABILIZATION CONTRACTS
 * 
 * Foundational types for infrastructure dependency mapping, service contracts, and extraction readiness.
 */

export type InfrastructureLayer = 'core' | 'intelligence' | 'runtime' | 'business' | 'product' | 'market';
export type DependencyType = 'hard' | 'soft' | 'optional';

export interface ServiceContract {
  id: string;
  layer: InfrastructureLayer;
  version: string;
  methods: string[];
  dependencies: string[]; // contract IDs
  is_extraction_ready: boolean;
}

export interface DependencyNode {
  id: string;
  type: 'module' | 'service' | 'vertical';
  layer: InfrastructureLayer;
  dependencies: Array<{ id: string, type: DependencyType }>;
}

export interface ExtractionProfile {
  product_id: string;
  required_contracts: string[];
  shared_capabilities: string[];
  readiness_score: number; // 0-100
}

export interface ExecutionPulse {
  trace_id: string;
  layer: InfrastructureLayer;
  operation: string;
  timestamp: string;
  duration_ms: number;
}
