/**
 * RUNTIME SCHEDULER
 *
 * Manages execution prioritization, queuing, and device-aware scheduling.
 * Ensures critical educational operations take priority over background tasks.
 */

import { RuntimeRequest, RuntimeExecution } from './types';
import { ExecutionPolicy } from './inferencePolicyEngine';
import { DeviceProfiler } from './device/deviceProfiler';
import { Telemetry } from '../observability/telemetry';

export interface ExecutionQueueItem {
  id: string;
  request: RuntimeRequest;
  policy: ExecutionPolicy;
  priority_score: number;
  queued_at: number;
  estimated_duration: number;
}

export class RuntimeScheduler {
  private queue: ExecutionQueueItem[] = [];
  private activeExecutions = new Map<string, RuntimeExecution>();
  private deviceProfiler = new DeviceProfiler();

  async scheduleExecution(request: RuntimeRequest, policy: ExecutionPolicy): Promise<RuntimeExecution> {
    const deviceProfile = await this.deviceProfiler.getProfile();

    // Calculate priority score
    const priorityScore = this.calculatePriorityScore(request, policy, deviceProfile);

    // Estimate execution duration
    const estimatedDuration = this.estimateExecutionDuration(request, policy, deviceProfile);

    const queueItem: ExecutionQueueItem = {
      id: this.generateExecutionId(),
      request,
      policy,
      priority_score: priorityScore,
      queued_at: Date.now(),
      estimated_duration: estimatedDuration,
    };

    // Add to priority queue
    this.addToQueue(queueItem);

    // Check if we can execute immediately
    const canExecuteNow = await this.canExecuteImmediately(queueItem);

    if (canExecuteNow) {
      return this.createExecution(queueItem);
    }

    // Wait for execution slot
    return new Promise((resolve) => {
      this.waitForExecutionSlot(queueItem, resolve);
    });
  }

  private calculatePriorityScore(request: RuntimeRequest, policy: ExecutionPolicy, device: any): number {
    let score = 0;

    // Base priority from policy
    const priorityValues = { critical: 100, high: 75, normal: 50, low: 25 };
    score += priorityValues[policy.priority];

    // Educational importance
    if (request.operation === 'retrieval') score += 20; // Content access is critical
    if (request.operation === 'reasoning') score += 15; // Adaptive learning is important
    if (request.operation === 'inference') score += 10; // AI assistance is valuable
    if (request.operation === 'generation') score += 5;  // Content generation is background

    // Device state adjustments
    if (device.batteryLevel < 20) score += 30; // Conserve battery for critical ops
    if (device.memoryPressure > 0.8) score += 25; // Memory pressure increases priority

    // Portal-specific adjustments
    if (request.portal_type === 'high_school') score += 10; // Student learning prioritized

    return Math.min(score, 200); // Cap at 200
  }

  private estimateExecutionDuration(request: RuntimeRequest, policy: ExecutionPolicy, device: any): number {
    let baseDuration = 1000; // 1 second base

    // Operation-specific duration
    const operationMultipliers = {
      retrieval: 0.5,
      inference: 2.0,
      reasoning: 3.0,
      generation: 5.0,
    };

    baseDuration *= operationMultipliers[request.operation] || 1;

    // Mode-specific adjustments
    if (policy.mode === 'offline') baseDuration *= 0.8;
    if (policy.mode === 'local') baseDuration *= 1.2;
    if (policy.mode === 'cloud') baseDuration *= 2.0;
    if (policy.mode === 'hybrid') baseDuration *= 1.5;

    // Device adjustments
    if (device.processorClass === 'low') baseDuration *= 1.5;
    if (device.memoryClass === 'low') baseDuration *= 1.3;

    return Math.max(baseDuration, 500); // Minimum 500ms
  }

  private addToQueue(item: ExecutionQueueItem): void {
    // Insert in priority order (higher score = higher priority)
    const insertIndex = this.queue.findIndex(existing => existing.priority_score < item.priority_score);
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }
  }

  private async canExecuteImmediately(item: ExecutionQueueItem): Promise<boolean> {
    const activeCount = this.activeExecutions.size;
    const maxConcurrent = this.getMaxConcurrent(item.policy.priority);

    if (activeCount >= maxConcurrent) {
      return false;
    }

    // Check resource availability
    const device = await this.deviceProfiler.getProfile();
    const memoryPressure = await this.getMemoryPressure();

    if (memoryPressure > 0.9) return false; // Too much memory pressure
    if ((device.batteryLevel ?? 100) < 10) return false; // Critical battery

    return true;
  }

  private createExecution(item: ExecutionQueueItem): RuntimeExecution {
    const execution: RuntimeExecution = {
      runtime_id: item.id,
      execution_mode: item.policy.mode,
      portal_type: item.request.portal_type,
      canonical_id: item.request.canonical_id,
      latency_budget: item.policy.latency_budget,
      memory_budget: item.policy.memory_budget,
      battery_budget: item.policy.battery_budget,
      fallback_strategy: item.policy.fallback_strategy,
      execution_priority: item.policy.priority,
      runtime_timestamp: new Date().toISOString(),
      operation: item.request.operation,
      context: item.request.payload?.context as Record<string, unknown> | undefined,
      learner_profile: item.request.payload?.learner_profile as Record<string, unknown> | undefined,
    };

    this.activeExecutions.set(item.id, execution);

    Telemetry.emit({
      event: 'RUNTIME_EXECUTION_SCHEDULED',
      source: 'runtime',
      portalType: item.request.portal_type,
      canonicalId: item.request.canonical_id,
      payload: {
        execution_id: item.id,
        priority_score: item.priority_score,
        queue_position: 0, // Immediate execution
        estimated_duration: item.estimated_duration,
      },
    });

    return execution;
  }

  private waitForExecutionSlot(item: ExecutionQueueItem, resolve: (execution: RuntimeExecution) => void): void {
    const checkQueue = async () => {
      const canExecute = await this.canExecuteImmediately(item);
      if (canExecute) {
        const execution = this.createExecution(item);
        resolve(execution);
        return;
      }

      // Check again in 100ms
      setTimeout(checkQueue, 100);
    };

    checkQueue();
  }

  private getMaxConcurrent(priority: string): number {
    const limits = {
      critical: 3,
      high: 2,
      normal: 1,
      low: 1,
    };

    return limits[priority as keyof typeof limits] || 1;
  }

  private async getMemoryPressure(): Promise<number> {
    const device = await this.deviceProfiler.getProfile();
    // TODO: Implement actual memory monitoring
    return 0.5; // Mock 50% memory usage
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getActiveCount(): Promise<number> {
    return this.activeExecutions.size;
  }

  async getQueueDepth(): Promise<number> {
    return this.queue.length;
  }

  // Clean up completed executions
  completeExecution(executionId: string): void {
    this.activeExecutions.delete(executionId);

    Telemetry.emit({
      event: 'RUNTIME_EXECUTION_COMPLETED',
      source: 'runtime',
      payload: { execution_id: executionId },
    });
  }
}