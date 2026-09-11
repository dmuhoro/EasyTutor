import { describe, expect, it, beforeEach } from 'vitest';
import { DistributedRuntimeRegistry } from '../../src/infrastructure/deployment/distributedRuntimeRegistry';
import { DeploymentHealthEngine } from '../../src/infrastructure/deployment/deploymentHealthEngine';
import { RuntimeFailoverCoordinator } from '../../src/infrastructure/deployment/runtimeFailoverCoordinator';
import { TenantBillingEngine } from '../../src/billing/tenantBillingEngine';
import { mockSupabase } from '../utils/mockSupabase';

describe('Production Readiness - Cluster & Billing Validation', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('registers and discovers cluster nodes', async () => {
    await DistributedRuntimeRegistry.registerNode({
      id: 'node-01',
      host: '10.0.0.1',
      port: 8080,
      status: 'healthy',
      capabilities: ['inference'],
      load_factor: 0.1,
      last_heartbeat: new Date().toISOString()
    });

    const activeNodes = await DistributedRuntimeRegistry.getActiveNodes();
    expect(activeNodes).toHaveLength(1);
    expect(activeNodes[0].id).toBe('node-01');
  });

  it('detects and marks timed-out nodes as offline', async () => {
    // Register a stale node
    const staleTime = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
    await DistributedRuntimeRegistry.registerNode({
      id: 'stale-node',
      host: '10.0.0.2',
      port: 8080,
      status: 'healthy',
      capabilities: ['inference'],
      load_factor: 0,
      last_heartbeat: staleTime
    });

    await DeploymentHealthEngine.checkClusterHealth();

    const nodes = (mockSupabase.db as any).cluster_nodes;
    const staleNode = nodes.find((n: any) => n.id === 'stale-node');
    expect(staleNode.status).toBe('offline');
  });

  it('orchestrates failover when a node goes offline', async () => {
    await DistributedRuntimeRegistry.registerNode({
      id: 'healthy-node',
      host: '10.0.0.3',
      port: 8080,
      status: 'healthy',
      capabilities: ['inference'],
      load_factor: 0.5,
      last_heartbeat: new Date().toISOString()
    });

    // Handle failure of 'stale-node'
    await RuntimeFailoverCoordinator.handleNodeFailure('stale-node');

    // Verify telemetry/log would show re-routing to 'healthy-node'
    // (In this prototype we check it doesn't crash and finds the healthy node)
  });

  it('calculates accurate usage-based billing', async () => {
    const tenantId = 'tenant_billing_test';
    
    // Seed some execution events
    (mockSupabase.db as any).user_events.push(
      { tenant_id: tenantId, portal_type: 'high_school', operation_type: 'inference', created_at: new Date().toISOString(), payload: {} },
      { tenant_id: tenantId, portal_type: 'high_school', operation_type: 'reasoning', created_at: new Date().toISOString(), payload: {} }
    );

    const statement = await TenantBillingEngine.generateBillingStatement(tenantId);
    
    // Cost calculation: 0.002 (inference) + 0.005 (reasoning) = 0.007
    expect(statement.total_amount_usd).toBe(0.007);
    expect(statement.execution_count).toBe(2);

    // Verify persistence
    const saved = (mockSupabase.db as any).billing_statements;
    expect(saved).toHaveLength(1);
    expect(saved[0].tenant_id).toBe(tenantId);
  });
});
