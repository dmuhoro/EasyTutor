import { ExecutionTracingEngine } from '../platform/executionTracingEngine';

/**
 * COGNITIVE TRACING VISUALIZER
 * 
 * Prepares distributed trace data for visualization in the operational console.
 */
export class CognitiveTracingVisualizer {
  static async getTraceMap(traceId: string): Promise<any> {
    const traces = await ExecutionTracingEngine.getInstance().getTrace(traceId);
    
    // Transform flat traces into a hierarchical tree for visualization
    return {
      trace_id: traceId,
      root_node: traces[0],
      span_count: traces.length,
      total_duration: traces.reduce((acc: number, span: any) => acc + (span.duration || 0), 0)
    };
  }
}
