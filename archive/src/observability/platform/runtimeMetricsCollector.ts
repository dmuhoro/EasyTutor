import { cognitiveMetricsEngine } from '../cognitiveMetricsEngine';

/**
 * RUNTIME METRICS COLLECTOR
 * 
 * Aggregates cognitive performance metrics across the entire platform.
 */
export class RuntimeMetricsCollector {
  private static instance: RuntimeMetricsCollector;

  static getInstance(): RuntimeMetricsCollector {
    if (!RuntimeMetricsCollector.instance) {
      RuntimeMetricsCollector.instance = new RuntimeMetricsCollector();
    }
    return RuntimeMetricsCollector.instance;
  }

  getAggregatedMetrics() {
    const raw = cognitiveMetricsEngine.snapshot();
    
    // Aggregate by tenant
    const tenantMetrics: Record<string, any> = {};
    
    Object.keys(raw).forEach(key => {
      if (key.startsWith('usage:')) {
        const parts = key.split(':');
        const tenantId = parts[1];
        const metricType = parts[2];
        
        if (!tenantMetrics[tenantId]) tenantMetrics[tenantId] = {};
        tenantMetrics[tenantId][metricType] = raw[key];
      }
    });

    return {
      timestamp: new Date().toISOString(),
      tenants: tenantMetrics,
      global: {
        total_executions: raw['runtime:execution_count'] || 0,
        active_workers: raw['platform:active_workers'] || 0
      }
    };
  }
}

export const runtimeMetricsCollector = RuntimeMetricsCollector.getInstance();
