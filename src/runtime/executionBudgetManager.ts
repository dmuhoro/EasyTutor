/**
 * EXECUTION BUDGET MANAGER
 *
 * Manages execution budgets for memory, battery, latency, and other resources.
 * Ensures device-aware execution and prevents resource exhaustion.
 */

import { RuntimeRequest } from './types';
import { ExecutionPolicy } from './inferencePolicyEngine';
import { DeviceProfiler } from './device/deviceProfiler';
import { Telemetry } from '../observability/telemetry';

export interface BudgetCheck {
  approved: boolean;
  reason?: string;
  warnings?: string[];
  adjusted_limits?: {
    memory_budget?: number;
    battery_budget?: number;
    latency_budget?: number;
  };
}

export interface ResourceUsage {
  memory_used: number;
  battery_used: number;
  active_executions: number;
  queue_depth: number;
}

export class ExecutionBudgetManager {
  private deviceProfiler = new DeviceProfiler();
  private resourceHistory: ResourceUsage[] = [];
  private readonly HISTORY_SIZE = 10;

  async checkBudgets(request: RuntimeRequest, policy: ExecutionPolicy): Promise<BudgetCheck> {
    const deviceProfile = await this.deviceProfiler.getProfile();
    const currentUsage = await this.getCurrentResourceUsage();

    const warnings: string[] = [];
    const adjustedLimits: BudgetCheck['adjusted_limits'] = {};

    // 1. MEMORY BUDGET CHECK
    const memoryCheck = this.checkMemoryBudget(policy, deviceProfile, currentUsage);
    if (!memoryCheck.approved) {
      return {
        approved: false,
        reason: memoryCheck.reason,
      };
    }
    if (memoryCheck.adjusted) {
      adjustedLimits.memory_budget = memoryCheck.adjusted;
    }

    // 2. BATTERY BUDGET CHECK
    const batteryCheck = this.checkBatteryBudget(policy, deviceProfile, currentUsage);
    if (!batteryCheck.approved) {
      return {
        approved: false,
        reason: batteryCheck.reason,
      };
    }
    if (batteryCheck.adjusted) {
      adjustedLimits.battery_budget = batteryCheck.adjusted;
    }

    // 3. LATENCY BUDGET CHECK
    const latencyCheck = this.checkLatencyBudget(policy, deviceProfile);
    if (!latencyCheck.approved && latencyCheck.warning) {
      warnings.push(latencyCheck.warning);
    }

    // 4. CONCURRENT EXECUTION CHECK
    const concurrencyCheck = this.checkConcurrencyBudget(policy, currentUsage);
    if (!concurrencyCheck.approved) {
      return {
        approved: false,
        reason: concurrencyCheck.reason,
      };
    }

    // 5. DEVICE-SPECIFIC ADJUSTMENTS
    const deviceAdjustments = this.applyDeviceAdjustments(policy, deviceProfile);
    Object.assign(adjustedLimits, deviceAdjustments);

    Telemetry.emit({
      event: 'RUNTIME_BUDGET_CHECKED',
      source: 'runtime',
      portalType: request.portal_type,
      canonicalId: request.canonical_id,
      payload: {
        operation: request.operation,
        approved: true,
        warnings: warnings.length,
        memory_pressure: currentUsage.memory_used / (deviceProfile.memoryTotal ?? 1),
          battery_level: deviceProfile.batteryLevel ?? 100,
        active_executions: currentUsage.active_executions,
      },
    });

    return {
      approved: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      adjusted_limits: Object.keys(adjustedLimits).length > 0 ? adjustedLimits : undefined,
    };
  }

  private checkMemoryBudget(
    policy: ExecutionPolicy,
    device: any,
    usage: ResourceUsage
  ): { approved: boolean; reason?: string; adjusted?: number } {
    // Device reports memory in MB, normalize to bytes
    const totalMemoryBytes = (device.memoryTotal || 0) * 1024 * 1024;
    const availableMemory = totalMemoryBytes - usage.memory_used;
    const requestedMemory = policy.memory_budget;

    if (availableMemory < requestedMemory * 0.5) { // Require 50% of requested memory available
      return {
        approved: false,
        reason: `Insufficient memory: ${availableMemory} available, ${requestedMemory} requested`,
      };
    }

    // Adjust budget for low memory devices
    if (device.memoryClass === 'low' && requestedMemory > 30 * 1024 * 1024) {
      return {
        approved: true,
        adjusted: 30 * 1024 * 1024,
      };
    }

    return { approved: true };
  }

  private checkBatteryBudget(
    policy: ExecutionPolicy,
    device: any,
    usage: ResourceUsage
  ): { approved: boolean; reason?: string; adjusted?: number } {
    const batteryLevel = device.batteryLevel;
    const requestedBattery = policy.battery_budget;

    if (batteryLevel < requestedBattery * 2) { // Require 2x battery buffer
      return {
        approved: false,
        reason: `Insufficient battery: ${batteryLevel}% available, ${requestedBattery}% requested`,
      };
    }

    // Reduce battery usage on low battery
    if (batteryLevel < 30 && requestedBattery > 2) {
      return {
        approved: true,
        adjusted: Math.min(requestedBattery, 2),
      };
    }

    return { approved: true };
  }

  private checkLatencyBudget(policy: ExecutionPolicy, device: any): { approved: boolean; warning?: string } {
    // Check if latency budget is realistic for device
    if (device.processorClass === 'low' && policy.latency_budget < 1000) {
      return {
        approved: false,
        warning: 'Latency budget too aggressive for low-end device',
      };
    }

    return { approved: true };
  }

  private checkConcurrencyBudget(policy: ExecutionPolicy, usage: ResourceUsage): { approved: boolean; reason?: string } {
    const maxConcurrent = this.getMaxConcurrentExecutions(policy.priority);

    if (usage.active_executions >= maxConcurrent) {
      return {
        approved: false,
        reason: `Too many concurrent executions: ${usage.active_executions} active, max ${maxConcurrent}`,
      };
    }

    return { approved: true };
  }

  private getMaxConcurrentExecutions(priority: string): number {
    const limits = {
      critical: 3,
      high: 2,
      normal: 1,
      low: 1,
    };

    return limits[priority as keyof typeof limits] || 1;
  }

  private applyDeviceAdjustments(policy: ExecutionPolicy, device: any): Partial<ExecutionPolicy> {
    const adjustments: Partial<ExecutionPolicy> = {};

    // Low-end device adjustments
    if (device.processorClass === 'low') {
      adjustments.latency_budget = Math.max(policy.latency_budget, 2000);
    }

    if (device.memoryClass === 'low') {
      adjustments.memory_budget = Math.min(policy.memory_budget, 50 * 1024 * 1024);
    }

    return adjustments;
  }

  async getCurrentResourceUsage(): Promise<ResourceUsage> {
    // TODO: Implement actual resource monitoring
    // For now, return mock data
    return {
      memory_used: 100 * 1024 * 1024, // 100MB
      battery_used: 5, // 5%
      active_executions: 0,
      queue_depth: 0,
    };
  }

  async getMemoryPressure(): Promise<number> {
    const device = await this.deviceProfiler.getProfile();
    const usage = await this.getCurrentResourceUsage();
    return usage.memory_used / (device.memoryTotal ?? 1);
  }

  async getBatteryLevel(): Promise<number> {
    const device = await this.deviceProfiler.getProfile();
    return device.batteryLevel ?? 100;
  }
}