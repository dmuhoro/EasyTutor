import { Telemetry } from '../telemetry';
import { runtimeMetricsCollector } from './runtimeMetricsCollector';

/**
 * ANOMALY DETECTION ENGINE
 * 
 * Monitors runtime metrics for deviations in latency, error rates, 
 * or cost spikes that indicate platform instability or abuse.
 */
export class AnomalyDetectionEngine {
  private static LATENCY_THRESHOLD = 15000; // 15s
  private static ERROR_RATE_THRESHOLD = 0.1; // 10%

  static async analyze(): Promise<void> {
    const metrics = runtimeMetricsCollector.getAggregatedMetrics();
    
    // Check for high latency anomalies
    Object.entries(metrics.tenants).forEach(([tenantId, tenantData]: [string, any]) => {
      if (tenantData.latency > this.LATENCY_THRESHOLD) {
        this.triggerAlert(tenantId, 'HIGH_LATENCY_ANOMALY', { latency: tenantData.latency });
      }
      
      // Check for cost/token usage spikes
      if (tenantData.tokens > 50000) { // Example arbitrary threshold
        this.triggerAlert(tenantId, 'TOKEN_USAGE_SPIKE', { tokens: tenantData.tokens });
      }
    });
  }

  private static triggerAlert(tenantId: string, type: string, details: any): void {
    console.warn(`[ANOMALY ALERT] ${type} for tenant ${tenantId}`, details);
    
    Telemetry.emit({
      event: 'PLATFORM_ANOMALY_DETECTED',
      source: 'platform',
      operationType: 'anomaly_detection',
      payload: { tenant_id: tenantId, anomaly_type: type, ...details }
    });
  }
}
