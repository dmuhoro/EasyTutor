export class CognitiveMetricsEngine {
  private metrics: Record<string, number> = {};

  record(metric: string, value = 1): void {
    this.metrics[metric] = (this.metrics[metric] || 0) + value;
  }

  get(name: string): number {
    return this.metrics[name] || 0;
  }

  snapshot(): Record<string, number> {
    return { ...this.metrics };
  }
}

export const cognitiveMetricsEngine = new CognitiveMetricsEngine();
