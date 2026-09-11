import { useMetricsStore } from '../metrics';

export interface TraceSpan {
  name: string;
  startTime: number;
  tags?: Record<string, string>;
}

export class Tracer {
  private activeSpans = new Map<string, TraceSpan>();

  public startSpan(traceId: string, name: string, tags?: Record<string, string>): void {
    this.activeSpans.set(`${traceId}:${name}`, {
      name,
      startTime: Date.now(),
      tags,
    });
  }

  public endSpan(traceId: string, name: string): void {
    const key = `${traceId}:${name}`;
    const span = this.activeSpans.get(key);

    if (span) {
      const duration = Date.now() - span.startTime;
      useMetricsStore.getState().recordMetric(`TRACE_${name}`, duration, {
        ...span.tags,
        traceId,
      });
      this.activeSpans.delete(key);
    }
  }
}

export const globalTracer = new Tracer();

export const generateTraceId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};
