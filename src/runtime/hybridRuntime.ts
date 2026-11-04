/**
 * HYBRID RUNTIME ENGINE
 *
 * Centralized orchestration for hybrid AI execution, offline cognition,
 * predictive learning, and device-aware optimization.
 *
 * NON-NEGOTIABLE: ALL inference requests route through this engine.
 */

import { PortalType } from '../types/canonical';
import { RuntimeGovernor } from './runtimeGovernor';
import { InferencePolicyEngine } from './inferencePolicyEngine';
import { ExecutionBudgetManager } from './executionBudgetManager';
import { RuntimeScheduler } from './runtimeScheduler';
import { CognitiveExecutionGraph } from './cognitiveExecutionGraph';
import { Telemetry } from '../observability/telemetry';
import type {
  RuntimeExecution,
  RuntimeRequest,
  RuntimeResult,
  RuntimeTelemetry,
} from './types';

export type {
  RuntimeExecution,
  RuntimeRequest,
  RuntimeResult,
  RuntimeTelemetry,
} from './types';

export class HybridRuntime {
  private static instance: HybridRuntime;
  private governor = new RuntimeGovernor();
  private policyEngine = new InferencePolicyEngine();
  private budgetManager = new ExecutionBudgetManager();
  private scheduler = new RuntimeScheduler();
  private executionGraph = new CognitiveExecutionGraph();

  static getInstance(): HybridRuntime {
    if (!HybridRuntime.instance) {
      HybridRuntime.instance = new HybridRuntime();
    }
    return HybridRuntime.instance;
  }

  async execute(request: RuntimeRequest): Promise<RuntimeResult> {
    const startTime = Date.now();

    // 1. GOVERNANCE: Validate runtime request
    const governanceCheck = await this.governor.validateRequest(request);
    if (!governanceCheck.allowed) {
      throw new Error(`[RUNTIME GOVERNANCE] ${governanceCheck.reason}`);
    }

    // 2. POLICY: Determine execution strategy
    const policy = await this.policyEngine.determinePolicy(request);

    // 3. BUDGET: Check execution budgets
    const budgetCheck = await this.budgetManager.checkBudgets(request, policy);
    if (!budgetCheck.approved) {
      throw new Error(`[RUNTIME BUDGET] ${budgetCheck.reason}`);
    }

    // 4. SCHEDULE: Queue for execution
    const execution = await this.scheduler.scheduleExecution(request, policy);

    // 5. EXECUTE: Run through cognitive graph
    const result = await this.executionGraph.execute(execution);

    // 6. TELEMETRY: Emit runtime telemetry
    const telemetry: RuntimeTelemetry = {
      execution_time: Date.now() - startTime,
      memory_used: result.memory_used || 0,
      battery_impact: result.battery_impact || 0,
      network_used: execution.execution_mode !== 'offline',
      cache_hit: result.cache_hit || false,
      fallback_triggered: result.fallback_used || false,
    };

    Telemetry.emit({
      event: 'RUNTIME_EXECUTION_COMPLETED',
      source: 'runtime',
      portalType: request.portal_type,
      canonicalId: request.canonical_id,
      payload: {
        execution_mode: execution.execution_mode,
        operation: request.operation,
        success: result.success,
        ...telemetry,
      },
    });

    return {
      success: result.success,
      execution,
      result: result.data,
      fallback_used: result.fallback_used,
      telemetry,
    };
  }

  async getRuntimeStatus(): Promise<{
    active_executions: number;
    queue_depth: number;
    memory_pressure: number;
    battery_level: number;
    network_status: 'online' | 'offline' | 'degraded';
  }> {
    const network = await this.policyEngine.getNetworkStatus();

    return {
      active_executions: await this.scheduler.getActiveCount(),
      queue_depth: await this.scheduler.getQueueDepth(),
      memory_pressure: await this.budgetManager.getMemoryPressure(),
      battery_level: await this.budgetManager.getBatteryLevel(),
      network_status: network.status,
    };
  }
}