import { cognitiveMetricsEngine } from './cognitiveMetricsEngine';

/**
 * PREDICTIVE BEHAVIOR ANALYTICS
 * 
 * Analyzes sequence of user/agent events to predict 
 * future trends and system bottlenecks.
 */
export interface BehaviorTrend {
  event: string;
  frequency: number;
  probability: number;
}

export class PredictiveBehaviorAnalytics {
  analyzeSequence(events: string[]): { trending: BehaviorTrend[] } {
    const counts: Record<string, number> = {};
    for (const e of events) counts[e] = (counts[e] || 0) + 1;
    
    const total = events.length;
    const trends: BehaviorTrend[] = Object.entries(counts)
      .map(([event, frequency]) => ({
        event,
        frequency,
        probability: total > 0 ? frequency / total : 0
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Record trends to metrics engine
    trends.slice(0, 3).forEach(trend => {
      cognitiveMetricsEngine.record(`trend:${trend.event}:prob`, Math.round(trend.probability * 100));
    });

    return { trending: trends.slice(0, 5) };
  }

  predictNextEvent(currentEvent: string): string | null {
    // Basic prediction based on global probability
    // In production, this would use a transition matrix
    const trends = this.analyzeSequence([]).trending; // Would use real history
    return trends.length > 0 ? trends[0].event : null;
  }
}

export const predictiveBehaviorAnalytics = new PredictiveBehaviorAnalytics();
