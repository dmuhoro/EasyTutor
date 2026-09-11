/**
 * DEVICE OPTIMIZER
 *
 * Optimizes runtime behavior based on device capabilities.
 * Dynamically adjusts performance settings for optimal experience.
 */

import { DeviceProfiler, DeviceProfile } from './deviceProfiler';

export interface OptimizationSettings {
  cache: {
    max_size: number; // MB
    strategy: 'aggressive' | 'conservative' | 'balanced';
    eviction_policy: 'lru' | 'lfu' | 'size_based';
  };
  prefetch: {
    enabled: boolean;
    max_concurrent: number;
    batch_size: number;
    timeout: number; // ms
  };
  inference: {
    timeout: number; // ms
    quality: 'high' | 'medium' | 'low';
    concurrency: number;
  };
  network: {
    retry_attempts: number;
    timeout: number; // ms
    batch_requests: boolean;
  };
  memory: {
    gc_threshold: number; // MB
    pool_size: number;
    compression_enabled: boolean;
  };
}

export class DeviceOptimizer {
  private profiler = new DeviceProfiler();
  private currentSettings: OptimizationSettings | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    // Start continuous optimization
    await this.optimizeSettings();

    // Set up periodic re-optimization
    this.optimizationInterval = setInterval(async () => {
      await this.optimizeSettings();
    }, 60000); // Re-optimize every minute

    // Start device monitoring
    await this.profiler.monitorDeviceState();
  }

  async getCurrentSettings(): Promise<OptimizationSettings> {
    if (!this.currentSettings) {
      await this.optimizeSettings();
    }
    return this.currentSettings!;
  }

  private async optimizeSettings(): Promise<void> {
    const profile = await this.profiler.getDeviceProfile();
    const limits = await this.profiler.getResourceLimits();
    const optimalSettings = await this.profiler.getOptimalSettings();

    const newSettings: OptimizationSettings = {
      cache: {
        max_size: limits.max_cache_size,
        strategy: optimalSettings.cache_strategy,
        eviction_policy: this.selectEvictionPolicy(profile),
      },
      prefetch: {
        enabled: optimalSettings.prefetch_strategy !== 'disabled',
        max_concurrent: Math.min(3, limits.max_concurrent_operations),
        batch_size: this.calculateBatchSize(profile),
        timeout: this.calculatePrefetchTimeout(profile),
      },
      inference: {
        timeout: limits.inference_timeout,
        quality: optimalSettings.quality_level,
        concurrency: limits.max_concurrent_operations,
      },
      network: {
        retry_attempts: this.calculateRetryAttempts(profile),
        timeout: this.calculateNetworkTimeout(profile),
        batch_requests: this.shouldBatchRequests(profile),
      },
      memory: {
        gc_threshold: this.calculateGCThreshold(profile),
        pool_size: this.calculatePoolSize(profile),
        compression_enabled: this.shouldEnableCompression(profile),
      },
    };

    // Only update if settings changed significantly
    if (this.settingsChanged(newSettings)) {
      console.log('Applying new optimization settings:', newSettings);
      this.currentSettings = newSettings;

      // Notify runtime components of setting changes
      await this.notifySettingsChanged(newSettings);
    }
  }

  private selectEvictionPolicy(profile: DeviceProfile): 'lru' | 'lfu' | 'size_based' {
    // Choose eviction policy based on device characteristics
    if (profile.capabilities.storage.low_storage) {
      return 'size_based'; // Prioritize freeing space
    }

    if (profile.capabilities.performance.cpu_cores >= 4) {
      return 'lfu'; // Can afford frequency tracking
    }

    return 'lru'; // Simple and memory-efficient
  }

  private calculateBatchSize(profile: DeviceProfile): number {
    let batchSize = 5; // Default

    // Reduce batch size on low memory devices
    if (profile.capabilities.memory.low_memory) {
      batchSize = 2;
    }

    // Reduce batch size on low battery
    if (profile.capabilities.battery.low_power) {
      batchSize = Math.max(1, batchSize - 2);
    }

    // Increase batch size on fast networks and good battery
    if (profile.capabilities.network.speed === 'fast' &&
        profile.capabilities.battery.level > 0.5) {
      batchSize = Math.min(10, batchSize + 3);
    }

    return batchSize;
  }

  private calculatePrefetchTimeout(profile: DeviceProfile): number {
    let timeout = 5000; // Default 5s

    // Increase timeout on slow networks
    if (profile.capabilities.network.speed === 'slow') {
      timeout = 15000; // 15s
    }

    // Reduce timeout on low battery
    if (profile.capabilities.battery.low_power) {
      timeout = Math.max(2000, timeout * 0.5);
    }

    return timeout;
  }

  private calculateRetryAttempts(profile: DeviceProfile): number {
    let attempts = 3; // Default

    // Reduce retries on metered connections
    if (profile.capabilities.network.metered) {
      attempts = 1;
    }

    // Reduce retries on low battery
    if (profile.capabilities.battery.low_power) {
      attempts = Math.max(1, attempts - 1);
    }

    return attempts;
  }

  private calculateNetworkTimeout(profile: DeviceProfile): number {
    let timeout = 10000; // Default 10s

    // Increase timeout on slow networks
    if (profile.capabilities.network.speed === 'slow') {
      timeout = 30000; // 30s
    }

    // Reduce timeout on low battery
    if (profile.capabilities.battery.low_power) {
      timeout = Math.max(5000, timeout * 0.7);
    }

    return timeout;
  }

  private shouldBatchRequests(profile: DeviceProfile): boolean {
    // Batch requests on metered connections or slow networks
    return profile.capabilities.network.metered ||
           profile.capabilities.network.speed === 'slow';
  }

  private calculateGCThreshold(profile: DeviceProfile): number {
    // Set GC threshold as percentage of available memory
    const availableMB = profile.capabilities.memory.available;
    return Math.max(50, availableMB * 0.1); // 10% of available memory, min 50MB
  }

  private calculatePoolSize(profile: DeviceProfile): number {
    // Pool size based on available memory
    const availableMB = profile.capabilities.memory.available;

    if (availableMB < 512) return 2;
    if (availableMB < 1024) return 4;
    if (availableMB < 2048) return 8;
    return 16;
  }

  private shouldEnableCompression(profile: DeviceProfile): boolean {
    // Enable compression on low storage devices
    return profile.capabilities.storage.low_storage;
  }

  private settingsChanged(newSettings: OptimizationSettings): boolean {
    if (!this.currentSettings) return true;

    // Compare key settings that affect performance
    return this.currentSettings.cache.max_size !== newSettings.cache.max_size ||
           this.currentSettings.prefetch.enabled !== newSettings.prefetch.enabled ||
           this.currentSettings.inference.quality !== newSettings.inference.quality ||
           this.currentSettings.memory.gc_threshold !== newSettings.memory.gc_threshold;
  }

  private async notifySettingsChanged(settings: OptimizationSettings): Promise<void> {
    // Notify various runtime components of setting changes
    // This would trigger re-configuration of caches, inference engines, etc.

    console.log('Optimization settings updated, notifying components...');

    // Mock notifications - in real implementation would emit events or call update methods
    // await this.cacheManager.updateSettings(settings.cache);
    // await this.prefetchManager.updateSettings(settings.prefetch);
    // await this.inferenceEngine.updateSettings(settings.inference);
  }

  async forceReoptimization(): Promise<void> {
    await this.optimizeSettings();
  }

  async getOptimizationStatus(): Promise<{
    last_optimized: string;
    current_profile: DeviceProfile;
    active_settings: OptimizationSettings;
    performance_metrics: {
      cache_hit_rate: number;
      prefetch_success_rate: number;
      average_response_time: number;
    };
  }> {
    const profile = await this.profiler.getDeviceProfile();
    const settings = await this.getCurrentSettings();

    return {
      last_optimized: new Date().toISOString(),
      current_profile: profile,
      active_settings: settings,
      performance_metrics: {
        cache_hit_rate: 0.85, // Mock - would be actual metrics
        prefetch_success_rate: 0.78, // Mock
        average_response_time: 1200, // Mock - 1.2s
      },
    };
  }

  async optimizeForScenario(scenario: 'learning' | 'assessment' | 'review' | 'exploration'): Promise<void> {
    // Adjust optimization settings based on usage scenario
    const baseSettings = await this.getCurrentSettings();

    switch (scenario) {
      case 'learning':
        // Prioritize prefetching and caching for learning sessions
        baseSettings.prefetch.enabled = true;
        baseSettings.prefetch.max_concurrent = Math.min(5, baseSettings.prefetch.max_concurrent + 1);
        baseSettings.cache.strategy = 'aggressive';
        break;

      case 'assessment':
        // Prioritize reliability and speed for assessments
        baseSettings.inference.timeout = Math.max(5000, baseSettings.inference.timeout * 0.8);
        baseSettings.network.retry_attempts = Math.min(5, baseSettings.network.retry_attempts + 1);
        break;

      case 'review':
        // Optimize for quick access to cached content
        baseSettings.cache.eviction_policy = 'lfu';
        baseSettings.prefetch.batch_size = Math.max(1, baseSettings.prefetch.batch_size - 1);
        break;

      case 'exploration':
        // Balance between discovery and performance
        baseSettings.prefetch.enabled = true;
        baseSettings.prefetch.batch_size = Math.min(3, baseSettings.prefetch.batch_size);
        break;
    }

    this.currentSettings = baseSettings;
    await this.notifySettingsChanged(baseSettings);
  }

  async cleanup(): Promise<void> {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
  }
}