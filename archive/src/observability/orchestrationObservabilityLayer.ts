import { executionAnalyticsEngine } from './executionAnalyticsEngine';
import { runtimeFailureAnalyzer, FailureAnalysis } from './runtimeFailureAnalyzer';
import { Telemetry } from './telemetry';

/**
 * ORCHESTRATION OBSERVABILITY LAYER
 * 
 * Unified facade for recording orchestration events, 
 * analyzing failures, and emitting governance-safe telemetry.
 */
export class OrchestrationObservabilityLayer {
  recordExecution(operation: string, latencyMs: number, metadata?: Record<string, unknown>): void {
    executionAnalyticsEngine.recordExecutionLatency(operation, latencyMs);
    
    Telemetry.emit({
      event: 'ORCHESTRATION_OP_COMPLETED',
      source: 'intelligence',
      latency: latencyMs,
      operationType: operation,
      payload: metadata
    });
  }

  analyzeFailure(error: Error | string): FailureAnalysis {
    const analysis = runtimeFailureAnalyzer.analyze(error);
    
    Telemetry.emit({
      event: 'ORCHESTRATION_OP_FAILED',
      source: 'intelligence',
      operationType: 'FAILURE_ANALYSIS',
      payload: {
        severity: analysis.severity,
        reason: analysis.reason,
        strategy: analysis.strategy
      }
    });

    return analysis;
  }
}

export const orchestrationObservabilityLayer = new OrchestrationObservabilityLayer();
