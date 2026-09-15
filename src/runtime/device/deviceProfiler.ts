/**
 * DEVICE PROFILER
 *
 * Profiles device capabilities for runtime optimization.
 * Monitors device state and adjusts runtime behavior.
 */

import { Dimensions, Platform } from 'react-native';

// Guard: react-native-device-info is only available in native Expo environments.
// In tests (Node.js) or web builds the module is absent — we fall back to a safe stub.
let DeviceInfo: any;
try {
   
  DeviceInfo = require('react-native-device-info');
  // Handle both default and named exports
  if (DeviceInfo?.default) DeviceInfo = DeviceInfo.default;
} catch {
  DeviceInfo = {
    getTotalMemory: async () => 4 * 1024 * 1024 * 1024,
    getFreeDiskStorage: async () => 10 * 1024 * 1024 * 1024,
    getTotalDiskStorage: async () => 32 * 1024 * 1024 * 1024,
    getBatteryLevel: async () => 0.8,
    isBatteryCharging: async () => true,
    getProcessorCount: async () => 4,
  };
}

export interface DeviceCapabilities {
  platform: 'ios' | 'android';
  memory: {
    total: number; // MB
    available: number; // MB
    low_memory: boolean;
  };
  storage: {
    total: number; // MB
    available: number; // MB
    low_storage: boolean;
  };
  battery: {
    level: number; // 0-1
    charging: boolean;
    low_power: boolean;
  };
  network: {
    type: 'wifi' | 'cellular' | 'none';
    speed: 'fast' | 'slow' | 'unknown';
    metered: boolean;
  };
  screen: {
    width: number;
    height: number;
    density: number;
    orientation: 'portrait' | 'landscape';
  };
  performance: {
    cpu_cores: number;
    gpu_available: boolean;
    inference_capable: boolean;
  };
}

export interface DeviceProfile {
  capabilities: DeviceCapabilities;
  optimization_hints: {
    prefer_offline: boolean;
    reduce_quality: boolean;
    limit_concurrency: boolean;
    cache_aggressively: boolean;
    prefetch_limited: boolean;
  };
  last_updated: string;
  // Convenience top-level fields for compatibility
  memoryTotal?: number;
  batteryLevel?: number; // 0-100
  memoryClass?: 'low' | 'medium' | 'high';
  processorClass?: 'low' | 'medium' | 'high';
}

export class DeviceProfiler {
  private profile: DeviceProfile | null = null;
  private readonly PROFILE_CACHE_TIME = 30000; // 30 seconds

  async getDeviceProfile(): Promise<DeviceProfile> {
    // Return cached profile if recent
    if (this.profile && this.isProfileRecent()) {
      return this.profile;
    }

    // Generate new profile
    const capabilities = await this.assessCapabilities();
    const optimizationHints = this.generateOptimizationHints(capabilities);

    this.profile = {
      capabilities,
      optimization_hints: optimizationHints,
      last_updated: new Date().toISOString(),
      memoryTotal: capabilities.memory.total,
      batteryLevel: Math.round(capabilities.battery.level * 100),
      memoryClass: capabilities.memory.total < 2048 ? 'low' : capabilities.memory.total < 4096 ? 'medium' : 'high',
      processorClass: capabilities.performance.cpu_cores <= 2 ? 'low' : capabilities.performance.cpu_cores <= 4 ? 'medium' : 'high',
    };

    return this.profile;
  }

  // Backwards-compatible alias used across the runtime
  async getProfile(): Promise<DeviceProfile> {
    return this.getDeviceProfile();
  }

  private isProfileRecent(): boolean {
    if (!this.profile) return false;

    const lastUpdate = new Date(this.profile.last_updated).getTime();
    const now = Date.now();

    return (now - lastUpdate) < this.PROFILE_CACHE_TIME;
  }

  private async assessCapabilities(): Promise<DeviceCapabilities> {
    // Get basic device info
    const platform = Platform.OS as 'ios' | 'android';
    const totalMemory = await DeviceInfo.getTotalMemory() / (1024 * 1024); // MB
    const freeStorage = await DeviceInfo.getFreeDiskStorage() / (1024 * 1024); // MB
    const totalStorage = await DeviceInfo.getTotalDiskStorage() / (1024 * 1024); // MB
    const batteryLevel = await DeviceInfo.getBatteryLevel();
    const isCharging = await DeviceInfo.isBatteryCharging();
    const cpuCores = await DeviceInfo.getProcessorCount();

    // Screen dimensions
    const { width, height } = Dimensions.get('window');
    const pixelRatio = Dimensions.get('window').scale;

    // Network type (mock - would use NetInfo)
    const networkType = 'wifi'; // Mock
    const networkSpeed = 'fast'; // Mock

    return {
      platform,
      memory: {
        total: totalMemory,
        available: totalMemory * 0.7, // Mock available memory
        low_memory: totalMemory < 2048, // Less than 2GB
      },
      storage: {
        total: totalStorage,
        available: freeStorage,
        low_storage: freeStorage < 1024, // Less than 1GB
      },
      battery: {
        level: batteryLevel,
        charging: isCharging,
        low_power: batteryLevel < 0.2 && !isCharging,
      },
      network: {
        type: networkType as 'wifi' | 'cellular' | 'none',
        speed: networkSpeed as 'fast' | 'slow' | 'unknown',
        metered: false, // Mock
      },
      screen: {
        width,
        height,
        density: pixelRatio,
        orientation: height > width ? 'portrait' : 'landscape',
      },
      performance: {
        cpu_cores: cpuCores,
        gpu_available: platform === 'ios' || cpuCores >= 4, // Rough heuristic
        inference_capable: totalMemory >= 4096 && cpuCores >= 4, // 4GB+ RAM and 4+ cores
      },
    };
  }

  private generateOptimizationHints(capabilities: DeviceCapabilities): DeviceProfile['optimization_hints'] {
    return {
      prefer_offline: capabilities.memory.low_memory || capabilities.battery.low_power,
      reduce_quality: capabilities.memory.low_memory || capabilities.performance.cpu_cores < 4,
      limit_concurrency: capabilities.memory.low_memory || capabilities.performance.cpu_cores < 2,
      cache_aggressively: capabilities.storage.available > 2048, // More than 2GB free
      prefetch_limited: capabilities.battery.low_power || capabilities.network.metered,
    };
  }

  async getResourceLimits(): Promise<{
    max_concurrent_operations: number;
    max_cache_size: number; // MB
    max_prefetch_size: number; // MB
    inference_timeout: number; // ms
  }> {
    const profile = await this.getDeviceProfile();

    let maxConcurrent = 4; // Default
    let maxCacheSize = 500; // Default 500MB
    let maxPrefetchSize = 100; // Default 100MB
    let inferenceTimeout = 10000; // Default 10s

    // Adjust based on memory
    if (profile.capabilities.memory.total < 2048) {
      maxConcurrent = 2;
      maxCacheSize = 200;
      maxPrefetchSize = 50;
      inferenceTimeout = 15000;
    } else if (profile.capabilities.memory.total < 4096) {
      maxConcurrent = 3;
      maxCacheSize = 300;
      maxPrefetchSize = 75;
      inferenceTimeout = 12000;
    }

    // Adjust based on CPU cores
    maxConcurrent = Math.min(maxConcurrent, profile.capabilities.performance.cpu_cores);

    // Adjust based on battery
    if (profile.capabilities.battery.low_power) {
      maxConcurrent = Math.max(1, maxConcurrent - 1);
      maxPrefetchSize = Math.floor(maxPrefetchSize * 0.5);
    }

    // Adjust based on storage
    maxCacheSize = Math.min(maxCacheSize, profile.capabilities.storage.available * 0.5);

    return {
      max_concurrent_operations: maxConcurrent,
      max_cache_size: maxCacheSize,
      max_prefetch_size: maxPrefetchSize,
      inference_timeout: inferenceTimeout,
    };
  }

  async shouldUseOfflineMode(): Promise<boolean> {
    const profile = await this.getDeviceProfile();

    // Use offline mode if:
    // - Low memory (prefer cached content)
    // - Low battery (save power)
    // - Slow network (avoid timeouts)
    // - Metered connection (save data)

    return profile.optimization_hints.prefer_offline ||
           profile.capabilities.battery.low_power ||
           profile.capabilities.network.speed === 'slow' ||
           profile.capabilities.network.metered;
  }

  async getOptimalSettings(): Promise<{
    cache_strategy: 'aggressive' | 'conservative' | 'balanced';
    prefetch_strategy: 'eager' | 'lazy' | 'disabled';
    quality_level: 'high' | 'medium' | 'low';
    concurrency_level: 'high' | 'medium' | 'low';
  }> {
    const profile = await this.getDeviceProfile();
    const limits = await this.getResourceLimits();

    // Determine cache strategy
    let cacheStrategy: 'aggressive' | 'conservative' | 'balanced' = 'balanced';
    if (profile.optimization_hints.cache_aggressively) {
      cacheStrategy = 'aggressive';
    } else if (profile.capabilities.memory.low_memory) {
      cacheStrategy = 'conservative';
    }

    // Determine prefetch strategy
    let prefetchStrategy: 'eager' | 'lazy' | 'disabled' = 'lazy';
    if (profile.optimization_hints.prefetch_limited) {
      prefetchStrategy = 'disabled';
    } else if (profile.capabilities.network.speed === 'fast' && !profile.capabilities.battery.low_power) {
      prefetchStrategy = 'eager';
    }

    // Determine quality level
    let qualityLevel: 'high' | 'medium' | 'low' = 'high';
    if (profile.optimization_hints.reduce_quality) {
      qualityLevel = profile.capabilities.memory.low_memory ? 'low' : 'medium';
    }

    // Determine concurrency level
    let concurrencyLevel: 'high' | 'medium' | 'low' = 'medium';
    if (limits.max_concurrent_operations >= 4) {
      concurrencyLevel = 'high';
    } else if (limits.max_concurrent_operations <= 2) {
      concurrencyLevel = 'low';
    }

    return {
      cache_strategy: cacheStrategy,
      prefetch_strategy: prefetchStrategy,
      quality_level: qualityLevel,
      concurrency_level: concurrencyLevel,
    };
  }

  async monitorDeviceState(): Promise<void> {
    // Continuous monitoring of device state
    // In a real implementation, this would set up listeners for:
    // - Memory pressure changes
    // - Battery level changes
    // - Network changes
    // - Storage changes

    setInterval(async () => {
      const newProfile = await this.getDeviceProfile();

      // Check for significant changes that require re-optimization
      if (this.hasSignificantChange(newProfile)) {
        console.log('Device state changed significantly, re-optimizing...');
        // Trigger re-optimization of runtime components
      }
    }, this.PROFILE_CACHE_TIME);
  }

  private hasSignificantChange(newProfile: DeviceProfile): boolean {
    if (!this.profile) return true;

    const old = this.profile.capabilities;
    const new_ = newProfile.capabilities;

    // Check for significant changes
    return Math.abs(old.memory.available - new_.memory.available) > 100 || // 100MB memory change
           Math.abs(old.battery.level - new_.battery.level) > 0.1 || // 10% battery change
           old.network.type !== new_.network.type || // Network type change
           old.battery.low_power !== new_.battery.low_power; // Low power mode change
  }

  async getDeviceHealth(): Promise<{
    overall_health: 'good' | 'fair' | 'poor';
    issues: string[];
    recommendations: string[];
  }> {
    const profile = await this.getDeviceProfile();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check memory
    if (profile.capabilities.memory.low_memory) {
      issues.push('Low available memory');
      recommendations.push('Close unused apps to free memory');
    }

    // Check storage
    if (profile.capabilities.storage.low_storage) {
      issues.push('Low storage space');
      recommendations.push('Clear cache or delete unused files');
    }

    // Check battery
    if (profile.capabilities.battery.low_power) {
      issues.push('Low battery');
      recommendations.push('Connect charger or reduce background activity');
    }

    // Check network
    if (profile.capabilities.network.speed === 'slow') {
      issues.push('Slow network connection');
      recommendations.push('Switch to WiFi or find better signal');
    }

    // Determine overall health
    let overallHealth: 'good' | 'fair' | 'poor' = 'good';
    if (issues.length >= 2) {
      overallHealth = 'poor';
    } else if (issues.length === 1) {
      overallHealth = 'fair';
    }

    return {
      overall_health: overallHealth,
      issues,
      recommendations,
    };
  }
}