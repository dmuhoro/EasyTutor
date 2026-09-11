/**
 * TELEMETRY ENGINE
 *
 * Collects and analyzes runtime telemetry data.
 * Provides insights for continuous optimization.
 */

export interface TelemetryEvent {
  event: string;
  source: string;
  timestamp: string;
  payload: Record<string, unknown>;
  session_id?: string;
  user_id?: string;
  device_id?: string;
}

export interface TelemetryMetrics {
  performance: {
    average_response_time: number;
    cache_hit_rate: number;
    error_rate: number;
    throughput: number;
  };
  usage: {
    total_requests: number;
    offline_requests: number;
    sync_operations: number;
    cache_operations: number;
  };
  device: {
    battery_impact: number;
    memory_usage: number;
    storage_usage: number;
    network_usage: number;
  };
}

export class TelemetryEngine {
  private events: TelemetryEvent[] = [];
  private readonly MAX_EVENTS = 1000;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicFlush();
  }

  emit(event: Omit<TelemetryEvent, 'timestamp'>): void {
    const telemetryEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(telemetryEvent);

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Immediate flush for critical events
    if (this.isCriticalEvent(event.event)) {
      this.flushEvents();
    }
  }

  private isCriticalEvent(eventType: string): boolean {
    const criticalEvents = [
      'RUNTIME_CRASH',
      'OFFLINE_FAILURE',
      'MEMORY_PRESSURE',
      'BATTERY_CRITICAL',
      'NETWORK_ERROR',
    ];

    return criticalEvents.includes(eventType);
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.FLUSH_INTERVAL);
  }

  private async flushEvents(): Promise<void> {
    if (this.events.length === 0) return;

    try {
      // Batch events for upload
      const batch = [...this.events];
      this.events = [];

      // Mock upload - would send to telemetry service
      await this.uploadTelemetryBatch(batch);

      console.log(`Flushed ${batch.length} telemetry events`);
    } catch (error) {
      console.warn('Failed to flush telemetry events:', error);
      // Re-queue failed events
      this.events.unshift(...this.events.slice(0, 100)); // Keep only first 100 to prevent memory issues
    }
  }

  private async uploadTelemetryBatch(batch: TelemetryEvent[]): Promise<void> {
    // Mock implementation - would upload to cloud service
    // In real implementation, would use fetch or specialized telemetry SDK

    console.log(`Uploading ${batch.length} telemetry events...`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Would validate response and handle retries
  }

  async getMetrics(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<TelemetryMetrics> {
    const now = Date.now();
    const rangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    }[timeRange];

    const cutoff = now - rangeMs;
    const relevantEvents = this.events.filter(e =>
      new Date(e.timestamp).getTime() > cutoff
    );

    return this.calculateMetrics(relevantEvents);
  }

  private calculateMetrics(events: TelemetryEvent[]): TelemetryMetrics {
    const performance = this.calculatePerformanceMetrics(events);
    const usage = this.calculateUsageMetrics(events);
    const device = this.calculateDeviceMetrics(events);

    return { performance, usage, device };
  }

  private calculatePerformanceMetrics(events: TelemetryEvent[]): TelemetryMetrics['performance'] {
    const responseTimeEvents = events.filter(e => e.payload.response_time);
    const cacheEvents = events.filter(e => e.event.includes('CACHE'));
    const errorEvents = events.filter(e => e.event.includes('ERROR'));
    const requestEvents = events.filter(e => e.event.includes('REQUEST'));

    const averageResponseTime = responseTimeEvents.length > 0
      ? responseTimeEvents.reduce((sum, e) => sum + (e.payload.response_time as number), 0) / responseTimeEvents.length
      : 0;

    const cacheHits = cacheEvents.filter(e => e.payload.hit === true).length;
    const cacheHitRate = cacheEvents.length > 0 ? cacheHits / cacheEvents.length : 0;

    const errorRate = requestEvents.length > 0 ? errorEvents.length / requestEvents.length : 0;

    const throughput = requestEvents.length / (24 * 60 * 60); // requests per second over 24h

    return {
      average_response_time: averageResponseTime,
      cache_hit_rate: cacheHitRate,
      error_rate: errorRate,
      throughput,
    };
  }

  private calculateUsageMetrics(events: TelemetryEvent[]): TelemetryMetrics['usage'] {
    const totalRequests = events.filter(e => e.event.includes('REQUEST')).length;
    const offlineRequests = events.filter(e =>
      e.event.includes('REQUEST') && e.payload.offline === true
    ).length;
    const syncOperations = events.filter(e => e.event.includes('SYNC')).length;
    const cacheOperations = events.filter(e => e.event.includes('CACHE')).length;

    return {
      total_requests: totalRequests,
      offline_requests: offlineRequests,
      sync_operations: syncOperations,
      cache_operations: cacheOperations,
    };
  }

  private calculateDeviceMetrics(events: TelemetryEvent[]): TelemetryMetrics['device'] {
    const batteryEvents = events.filter(e => e.payload.battery_level);
    const memoryEvents = events.filter(e => e.payload.memory_usage);
    const storageEvents = events.filter(e => e.payload.storage_usage);
    const networkEvents = events.filter(e => e.payload.network_usage);

    const batteryImpact = batteryEvents.length > 0
      ? batteryEvents.reduce((sum, e) => sum + (e.payload.battery_impact as number || 0), 0) / batteryEvents.length
      : 0;

    const memoryUsage = memoryEvents.length > 0
      ? memoryEvents.reduce((sum, e) => sum + (e.payload.memory_usage as number), 0) / memoryEvents.length
      : 0;

    const storageUsage = storageEvents.length > 0
      ? storageEvents.reduce((sum, e) => sum + (e.payload.storage_usage as number), 0) / storageEvents.length
      : 0;

    const networkUsage = networkEvents.length > 0
      ? networkEvents.reduce((sum, e) => sum + (e.payload.network_usage as number), 0) / networkEvents.length
      : 0;

    return {
      battery_impact: batteryImpact,
      memory_usage: memoryUsage,
      storage_usage: storageUsage,
      network_usage: networkUsage,
    };
  }

  async getAnomalyReport(): Promise<{
    anomalies: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      timestamp: string;
    }>;
    recommendations: string[];
  }> {
    const metrics = await this.getMetrics('1h');
    const anomalies: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      timestamp: string;
    }> = [];

    // Check for performance anomalies
    if (metrics.performance.error_rate > 0.1) {
      anomalies.push({
        type: 'high_error_rate',
        severity: 'high',
        description: `Error rate is ${Math.round(metrics.performance.error_rate * 100)}%, above 10% threshold`,
        timestamp: new Date().toISOString(),
      });
    }

    if (metrics.performance.average_response_time > 5000) {
      anomalies.push({
        type: 'slow_response',
        severity: 'medium',
        description: `Average response time is ${Math.round(metrics.performance.average_response_time)}ms, above 5s threshold`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for device anomalies
    if (metrics.device.battery_impact > 0.05) {
      anomalies.push({
        type: 'high_battery_usage',
        severity: 'medium',
        description: `High battery drain detected: ${Math.round(metrics.device.battery_impact * 100)}% per hour`,
        timestamp: new Date().toISOString(),
      });
    }

    if (metrics.device.memory_usage > 0.8) {
      anomalies.push({
        type: 'high_memory_usage',
        severity: 'high',
        description: `Memory usage is ${Math.round(metrics.device.memory_usage * 100)}%, risking out-of-memory errors`,
        timestamp: new Date().toISOString(),
      });
    }

    const recommendations = this.generateRecommendations(anomalies);

    return { anomalies, recommendations };
  }

  private generateRecommendations(anomalies: any[]): string[] {
    const recommendations = [];

    for (const anomaly of anomalies) {
      switch (anomaly.type) {
        case 'high_error_rate':
          recommendations.push('Investigate error sources and implement retry logic');
          recommendations.push('Check network connectivity and API endpoints');
          break;
        case 'slow_response':
          recommendations.push('Optimize cache strategies and prefetching');
          recommendations.push('Consider device-specific optimizations');
          break;
        case 'high_battery_usage':
          recommendations.push('Reduce background operations and polling');
          recommendations.push('Implement battery-aware scheduling');
          break;
        case 'high_memory_usage':
          recommendations.push('Implement memory pooling and garbage collection');
          recommendations.push('Reduce cache sizes and implement eviction policies');
          break;
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  async exportTelemetryData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const events = [...this.events];

    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    } else {
      // CSV format
      const headers = ['timestamp', 'event', 'source', 'payload'];
      const rows = events.map(e => [
        e.timestamp,
        e.event,
        e.source,
        JSON.stringify(e.payload),
      ]);

      return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    }
  }

  async clearTelemetryData(): Promise<void> {
    this.events = [];
    console.log('Telemetry data cleared');
  }

  async getTelemetryStatus(): Promise<{
    events_queued: number;
    last_flush: string;
    storage_used: number; // bytes
    upload_success_rate: number;
  }> {
    return {
      events_queued: this.events.length,
      last_flush: new Date().toISOString(), // Mock - would track actual last flush
      storage_used: JSON.stringify(this.events).length,
      upload_success_rate: 0.95, // Mock - would track actual success rate
    };
  }

  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushEvents(); // Final flush
  }
}

// Global telemetry instance
export const Telemetry = new TelemetryEngine();