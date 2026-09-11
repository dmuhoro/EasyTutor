import { describe, expect, it, beforeEach } from 'vitest';
import { InfrastructureDependencyGraph } from '../../src/stabilization/InfrastructureDependencyGraph';
import { ServiceContractRegistry } from '../../src/stabilization/ServiceContractRegistry';
import { UnifiedExecutionCoordinator } from '../../src/stabilization/coordination/UnifiedExecutionCoordinator';
import { ProductExtractionManager } from '../../src/stabilization/extraction/ProductExtractionManager';
import { RuntimeLoadBalancer } from '../../src/stabilization/performance/RuntimeLoadBalancer';
import { VerticalProductRegistry } from '../../src/productization/VerticalProductRegistry';
import { DistributedRuntimeRegistry } from '../../src/infrastructure/deployment/distributedRuntimeRegistry';
import { mockSupabase } from '../utils/mockSupabase';

describe('Platform Stabilization - System Integrity Validation', () => {
  beforeEach(() => {
    mockSupabase.reset();
    VerticalProductRegistry.initialize();
    
    // Register initial contracts
    ServiceContractRegistry.register({
      id: 'contract:inference',
      layer: 'intelligence',
      version: '1.0.0',
      methods: ['execute'],
      dependencies: [],
      is_extraction_ready: true
    });
  });

  it('detects circular dependencies in infrastructure graph', () => {
    const graph = new InfrastructureDependencyGraph();
    graph.registerNode({ id: 'A', layer: 'core', type: 'module', dependencies: [{ id: 'B', type: 'hard' }] });
    graph.registerNode({ id: 'B', layer: 'core', type: 'module', dependencies: [{ id: 'C', type: 'hard' }] });
    graph.registerNode({ id: 'C', layer: 'core', type: 'module', dependencies: [{ id: 'A', type: 'hard' }] });

    const circles = graph.validateCircularDependencies();
    expect(circles).toHaveLength(1); // A->B->C->A
    expect(circles[0]).toContain('A -> B -> C -> A');
  });

  it('coordinates deterministic cross-layer execution', async () => {
    const result = await UnifiedExecutionCoordinator.coordinateExecution(
      'trace_123',
      'runtime',
      'test_op',
      async () => 'success'
    );
    expect(result).toBe('success');
  });

  it('verifies product extraction readiness score', async () => {
    const profile = await ProductExtractionManager.analyzeReadiness('easytutor');
    expect(profile.readiness_score).toBeGreaterThan(0);
    expect(profile.product_id).toBe('easytutor');
  });

  it('selects optimal execution node via load balancer', async () => {
    // Seed a mock node
    await DistributedRuntimeRegistry.registerNode({
      id: 'node_opt',
      host: 'localhost',
      port: 8080,
      status: 'healthy',
      capabilities: ['inference'],
      load_factor: 0.1,
      last_heartbeat: new Date().toISOString()
    });

    const nodeId = await RuntimeLoadBalancer.selectOptimalNode(['inference']);
    expect(nodeId).toBe('node_opt');
  });
});
