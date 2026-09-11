import { describe, expect, it, beforeEach } from 'vitest';
import { DistributedHealthConsensusEngine } from '../../src/reliability/core/DistributedHealthConsensusEngine';
import { ExecutionIntegrityVerifier } from '../../src/reliability/core/ExecutionIntegrityVerifier';
import { DistributedCheckpointCoordinator } from '../../src/reliability/durability/DistributedCheckpointCoordinator';
import { PersistentExecutionStateManager } from '../../src/reliability/durability/PersistentExecutionStateManager';
import { CognitiveChaosEngine } from '../../src/reliability/chaos/CognitiveChaosEngine';
import { DistributedRuntimeRegistry } from '../../src/infrastructure/deployment/distributedRuntimeRegistry';
import { mockSupabase } from '../utils/mockSupabase';

describe('Production Reliability - System Resilience Validation', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('reaches health consensus across distributed nodes', async () => {
    await DistributedRuntimeRegistry.registerNode({
      id: 'node_alpha',
      host: 'localhost',
      port: 8081,
      status: 'healthy',
      capabilities: ['inference'],
      load_factor: 0.5,
      last_heartbeat: new Date().toISOString()
    });

    await DistributedRuntimeRegistry.registerNode({
      id: 'node_beta',
      host: 'localhost',
      port: 8082,
      status: 'healthy',
      capabilities: ['retrieval'],
      load_factor: 0.3,
      last_heartbeat: new Date().toISOString()
    });

    const consensus = await DistributedHealthConsensusEngine.evaluateNodeHealth('node_alpha');
    expect(consensus.quorum_reached).toBe(true);
    expect(consensus.agreed_state).toBe('healthy');
  });

  it('detects execution state corruption during failover', () => {
    const originalState = { step: 2, counter: 42 };
    const corruptedState = { step: 2, counter: 43 };
    
    const checkpoint = {
      checkpoint_id: 'chk_test',
      trace_id: 'trace_1',
      tenant_id: 'tenant_1',
      workflow_id: 'wf_1',
      step_index: 2,
      state_snapshot: originalState,
      timestamp: new Date().toISOString(),
      is_verified: true
    };

    const isIntact = ExecutionIntegrityVerifier.verifyCheckpoint(checkpoint, corruptedState);
    expect(isIntact).toBe(false);

    const isRecovered = ExecutionIntegrityVerifier.verifyCheckpoint(checkpoint, originalState);
    expect(isRecovered).toBe(true);
  });

  it('creates and retrieves deterministic execution checkpoints', async () => {
    const traceId = 'trace_long_lived';
    const state = { stage: 'processing', progress: 50 };
    
    const checkpointId = await DistributedCheckpointCoordinator.createCheckpoint(
      traceId,
      'tenant_test',
      'wf_long',
      1,
      state
    );

    expect(checkpointId).toContain('chk_');
    
    const dbRows = (mockSupabase.db as any).execution_checkpoints;
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].trace_id).toBe(traceId);
  });

  it('persists and loads long-lived workflow memory state', async () => {
    await PersistentExecutionStateManager.saveState('wf_persist', { status: 'paused', data: [1, 2, 3] });
    
    const loadedState = await PersistentExecutionStateManager.loadState('wf_persist');
    expect(loadedState).toBeDefined();
    expect(loadedState.status).toBe('paused');
    expect(loadedState.data).toHaveLength(3);
  });

  it('survives simulated worker crashes deterministically', async () => {
    const result = await CognitiveChaosEngine.simulateWorkerCrash('node_critical');
    
    expect(result.system_survived).toBe(true);
    expect(result.data_loss_detected).toBe(false);
    expect(result.scenario_type).toBe('worker_crash');
  });
});
