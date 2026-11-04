/**
 * INFERENCE POLICY ENGINE
 *
 * Determines optimal execution strategy based on:
 * - Device capabilities (memory, battery, connectivity)
 * - Content requirements (latency sensitivity, complexity)
 * - Network status and quality
 * - User preferences and portal policies
 */

import { RuntimeRequest } from './types';
import { DeviceProfiler } from './device/deviceProfiler';
import { Telemetry } from '../observability/telemetry';

export interface ExecutionPolicy {
  mode: 'local' | 'cloud' | 'hybrid' | 'offline';
  fallback_strategy: 'local_first' | 'cloud_first' | 'offline_only';
  priority: 'critical' | 'high' | 'normal' | 'low';
  latency_budget: number;
  memory_budget: number;
  battery_budget: number;
  network_required: boolean;
  cache_allowed: boolean;
  prefetch_allowed: boolean;
}

export interface NetworkStatus {
  status: 'online' | 'offline' | 'degraded';
  latency: number;
  bandwidth: number;
  reliability: number; // 0-1
}

export class InferencePolicyEngine {
  private deviceProfiler = new DeviceProfiler();
  private networkCache: { status: NetworkStatus; timestamp: number } | null = null;
  private readonly NETWORK_CACHE_TTL = 30000; // 30 seconds

  async determinePolicy(request: RuntimeRequest): Promise<ExecutionPolicy> {
    const deviceProfile = await this.deviceProfiler.getProfile();
    const networkStatus = await this.getNetworkStatus();

    // Base policy based on operation type
    const basePolicy = this.getBasePolicy(request.operation);

    // Adjust for device capabilities
    const deviceAdjusted = this.adjustForDevice(basePolicy, deviceProfile);

    // Adjust for network conditions
    const networkAdjusted = this.adjustForNetwork(deviceAdjusted, networkStatus);

    // Adjust for content requirements
    const contentAdjusted = this.adjustForContent(networkAdjusted, request);

    // Adjust for portal policies
    const portalAdjusted = this.adjustForPortal(contentAdjusted, request.portal_type);

    Telemetry.emit({
      event: 'RUNTIME_POLICY_DETERMINED',
      source: 'runtime',
      portalType: request.portal_type,
      canonicalId: request.canonical_id,
      payload: {
        operation: request.operation,
        mode: portalAdjusted.mode,
        fallback_strategy: portalAdjusted.fallback_strategy,
        network_status: networkStatus.status,
        device_memory: deviceProfile.memoryClass,
        device_battery: deviceProfile.batteryLevel,
      },
    });

    return portalAdjusted;
  }

  private getBasePolicy(operation: string): ExecutionPolicy {
    const basePolicies: Record<string, ExecutionPolicy> = {
      inference: {
        mode: 'hybrid',
        fallback_strategy: 'local_first',
        priority: 'normal',
        latency_budget: 2000,
        memory_budget: 50 * 1024 * 1024, // 50MB
        battery_budget: 5, // 5% battery
        network_required: false,
        cache_allowed: true,
        prefetch_allowed: true,
      },
      retrieval: {
        mode: 'local',
        fallback_strategy: 'offline_only',
        priority: 'high',
        latency_budget: 500,
        memory_budget: 20 * 1024 * 1024, // 20MB
        battery_budget: 1,
        network_required: false,
        cache_allowed: true,
        prefetch_allowed: true,
      },
      reasoning: {
        mode: 'hybrid',
        fallback_strategy: 'local_first',
        priority: 'normal',
        latency_budget: 3000,
        memory_budget: 100 * 1024 * 1024, // 100MB
        battery_budget: 10,
        network_required: false,
        cache_allowed: true,
        prefetch_allowed: false,
      },
      generation: {
        mode: 'cloud',
        fallback_strategy: 'cloud_first',
        priority: 'low',
        latency_budget: 5000,
        memory_budget: 200 * 1024 * 1024, // 200MB
        battery_budget: 15,
        network_required: true,
        cache_allowed: false,
        prefetch_allowed: false,
      },
    };

    return basePolicies[operation] || basePolicies.inference;
  }

  private adjustForDevice(policy: ExecutionPolicy, device: any): ExecutionPolicy {
    // Low memory devices prefer local/offline
    if (device.memoryClass === 'low') {
      policy.memory_budget = Math.min(policy.memory_budget, 30 * 1024 * 1024);
      if (policy.mode === 'cloud') policy.mode = 'hybrid';
    }

    // Low battery prefers offline
    if (device.batteryLevel < 20) {
      policy.battery_budget = Math.min(policy.battery_budget, 2);
      policy.mode = policy.mode === 'cloud' ? 'hybrid' : policy.mode;
    }

    return policy;
  }

  private adjustForNetwork(policy: ExecutionPolicy, network: NetworkStatus): ExecutionPolicy {
    if (network.status === 'offline') {
      policy.mode = 'offline';
      policy.fallback_strategy = 'offline_only';
      policy.network_required = false;
    } else if (network.status === 'degraded' || network.latency > 1000) {
      if (policy.mode === 'cloud') policy.mode = 'hybrid';
      policy.latency_budget = Math.max(policy.latency_budget, network.latency * 2);
    }

    return policy;
  }

  private adjustForContent(policy: ExecutionPolicy, request: RuntimeRequest): ExecutionPolicy {
    if (request.constraints?.maxLatency) {
      policy.latency_budget = Math.min(policy.latency_budget, request.constraints.maxLatency);
      if (policy.latency_budget < 1000) {
        policy.mode = 'local';
        policy.fallback_strategy = 'offline_only';
      }
    }

    if (request.constraints?.maxMemory) {
      policy.memory_budget = Math.min(policy.memory_budget, request.constraints.maxMemory);
    }

    if (request.constraints?.batterySensitive) {
      policy.battery_budget = Math.min(policy.battery_budget, 2);
    }

    return policy;
  }

  private adjustForPortal(policy: ExecutionPolicy, portalType: string): ExecutionPolicy {
    // Portal-specific adjustments
    if (portalType === 'high_school') {
      // High school prefers local for faster response
      if (policy.mode === 'cloud') policy.mode = 'hybrid';
    }

    return policy;
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    // Check cache first
    if (this.networkCache && Date.now() - this.networkCache.timestamp < this.NETWORK_CACHE_TTL) {
      return this.networkCache.status;
    }

    // TODO: Implement actual network detection
    // For now, assume online with good conditions
    const status: NetworkStatus = {
      status: 'online',
      latency: 100,
      bandwidth: 1000000, // 1Mbps
      reliability: 0.95,
    };

    this.networkCache = { status, timestamp: Date.now() };
    return status;
  }
}