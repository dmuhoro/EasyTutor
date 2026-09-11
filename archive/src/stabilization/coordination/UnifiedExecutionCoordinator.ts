import { InfrastructureLayer, ExecutionPulse } from '../stabilizationContracts';
import { Telemetry } from '../../observability/telemetry';

/**
 * UNIFIED EXECUTION COORDINATOR
 * 
 * Orchestrates complex executions that span multiple infrastructure layers, 
 * ensuring deterministic flow and context preservation.
 */
export class UnifiedExecutionCoordinator {
  static async coordinateExecution<T>(
    traceId: string,
    layer: InfrastructureLayer,
    operation: string,
    executionFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    console.log(`[EXECUTION PULSE] [${layer}] Starting ${operation}...`);

    try {
      const result = await executionFn();
      
      const duration = Date.now() - startTime;
      this.recordPulse({
        trace_id: traceId,
        layer,
        operation,
        timestamp: new Date().toISOString(),
        duration_ms: duration
      });

      return result;
    } catch (error) {
      console.error(`[EXECUTION FAILURE] [${layer}] ${operation} failed:`, error);
      throw error;
    }
  }

  private static recordPulse(pulse: ExecutionPulse): void {
    Telemetry.emit({
      event: 'EXECUTION_PULSE',
      source: 'platform',
      operationType: 'coordination',
      payload: pulse as any
    });
  }
}
